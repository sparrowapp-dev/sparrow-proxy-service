import { Module } from '@nestjs/common';
import { SocketIoModule } from './socketio/socketio.module';
import { HttpModule } from './http/http.module';

@Module({
  imports: [HttpModule, SocketIoModule],
})
export class ProxyModule {}
