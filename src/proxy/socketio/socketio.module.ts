import { Module } from '@nestjs/common';
import { SocketIoGateway } from './socketio.gateway';
import { SocketIoService } from './socketio.service';
import { WebSocketService } from './websocket.service';

@Module({
  providers: [SocketIoGateway, SocketIoService, WebSocketService],
  exports: [SocketIoService, WebSocketService],
})
export class SocketIoModule {}
