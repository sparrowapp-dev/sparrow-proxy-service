import { Module } from '@nestjs/common';
import { HttpController } from './http.controller';
import { HttpService } from './http.service';
import { HttpModule as NestHttpModule } from '@nestjs/axios';

@Module({
  imports: [NestHttpModule],
  controllers: [HttpController],
  providers: [HttpService],
})
export class HttpModule {}
