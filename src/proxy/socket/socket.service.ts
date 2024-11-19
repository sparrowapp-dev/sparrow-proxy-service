import { Injectable } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class SocketService {
  private realSocketClients: Map<string, Socket> = new Map();
  private frontendClients: Map<string, Socket> = new Map();

  /**
   * Connect to the real Socket.IO server
   */
  async connectToRealSocket(
    clientId: string,
    url: string,
    namespace: string,
  ): Promise<void> {
    if (this.realSocketClients.has(clientId)) {
      throw new Error(`ClientID=${clientId} is already connected`);
    }

    const realSocket = io(`${url}${namespace}`, { transports: ['websocket'] });

    await new Promise<void>((resolve, reject) => {
      realSocket.on('connect', () => {
        console.log(`Connected to real Socket.IO server: ${url}${namespace}`);
        this.realSocketClients.set(clientId, realSocket);
        resolve();
      });

      realSocket.on('connect_error', (err) => {
        reject(
          new Error(
            `Failed to connect to real Socket.IO server: ${err.message}`,
          ),
        );
      });
    });

    // Listen for all dynamic events from the real server
    realSocket.onAny((event: string, ...args: any[]) => {
      console.log(`Received event from real server: ${event}`, args);

      // Emit the event and arguments to the frontend WebSocket client
      const frontendSocket = this.frontendClients.get(clientId);
      if (frontendSocket) {
        frontendSocket.emit(event, ...args);
      }
    });
  }

  /**
   * Disconnect from the real Socket.IO server
   */
  async disconnectFromRealSocket(clientId: string): Promise<void> {
    const realSocket = this.realSocketClients.get(clientId);

    if (realSocket) {
      realSocket.disconnect();
      this.realSocketClients.delete(clientId);
      console.log(
        `Disconnected from real Socket.IO server: ClientID=${clientId}`,
      );
    }
  }

  /**
   * Emit a dynamic event to the real Socket.IO server
   */
  async emitToRealSocket(
    clientId: string,
    event: string,
    args: any[],
  ): Promise<void> {
    const realSocket = this.realSocketClients.get(clientId);

    if (!realSocket) {
      throw new Error(`No connection found for ClientID=${clientId}`);
    }

    realSocket.emit(event, ...args);
  }
}
