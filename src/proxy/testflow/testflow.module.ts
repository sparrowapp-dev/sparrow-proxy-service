import { Module } from '@nestjs/common';
import { TestflowController } from './testflow.controller';
import { TestflowService } from './testflow.service';
import { DecodeTestflow } from 'src/utils/decode-testflow';
import { HttpModule as NestHttpModule } from '@nestjs/axios';

@Module({
  imports: [NestHttpModule],
  controllers: [TestflowController],
  providers: [TestflowService, DecodeTestflow],
})
export class TestflowModule {}
