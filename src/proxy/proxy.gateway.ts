import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ProxyService } from './proxy.service';

@WebSocketGateway({ cors: true })
export class ProxyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Handle WebSocket connection from Sparrow Web App
   */
  async handleConnection(client: Socket) {
    const { url, namespace } = client.handshake.query;

    if (!url || !namespace) {
      client.disconnect();
      console.error('Missing required query parameters: url or namespace');
      return;
    }

    try {
      // Connect to the real Socket.IO server
      await this.proxyService.connectToRealSocket(
        client.id,
        url as string,
        namespace as string,
      );

      console.log(`Proxy connection established: ClientID=${client.id}`);

      // Listen for all dynamic events from the frontend and forward them
      client.onAny(async (event: string, ...args: any[]) => {
        console.log(`Received event from frontend: ${event}`, args);

        try {
          // Forward the dynamic event and its arguments to the real server
          await this.proxyService.emitToRealSocket(client.id, event, args);
        } catch (err) {
          console.error(`Failed to forward event ${event}: ${err.message}`);
        }
      });
    } catch (err) {
      console.error(
        `Failed to connect to real Socket.IO server: ${err.message}`,
      );
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    console.log(`Proxy connection closed: ClientID=${client.id}`);
    await this.proxyService.disconnectFromRealSocket(client.id);
  }
}
