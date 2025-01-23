import { Module } from '@nestjs/common';
import { DummyGateway } from './dummy.gateway';

@Module({
  providers: [DummyGateway],
  exports: [],
})
export class SocketIoModule {}
