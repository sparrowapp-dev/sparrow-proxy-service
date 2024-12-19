import { Module } from '@nestjs/common';
import { SocketIoGateway } from './socketio.gateway';
import { SocketIoService } from './socketio.service';
import { DummyGateway } from './dummy.gateway';

@Module({
  providers: [ DummyGateway],
  exports: [],
})
export class SocketIoModule {}
