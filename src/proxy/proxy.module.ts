import { Module } from '@nestjs/common';
import { SocketModule } from './socket/socket.module';
import { HttpModule } from './http/http.module';

@Module({
  imports: [HttpModule, SocketModule],
})
export class ProxyModule {}
