import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({
  namespace: '/dummy',
  cors: {
    origin: '*',
  },
  transports: ['websocket'],
  methods: ['GET', 'POST'],
})
export class DummyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor() {}
  async afterInit() {
    console.log('AI Websocket Gateway initialized!');
  }

  async handleConnection(client: Socket) {
    setTimeout(() => {
      client.emit('Client', 'Client is connected, first event initiated.');
    }, 5000);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('')
  async handleMessage2(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    client.emit('third', payload);
  }

  @SubscribeMessage('second')
  async handleMessage3(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    client.emit('second', payload);
    client.emit('latest', payload);
  }

  @SubscribeMessage('first')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ) {
    client.emit('first', payload);
    client.emit('new', payload);
  }
}
