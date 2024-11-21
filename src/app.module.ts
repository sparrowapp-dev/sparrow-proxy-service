import { Module } from '@nestjs/common';
import { ProxyModule } from './proxy/proxy.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [ProxyModule],
})
export class AppModule {}
