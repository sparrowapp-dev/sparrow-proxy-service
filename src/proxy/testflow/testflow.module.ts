import { Module } from '@nestjs/common';
import { TestflowController } from './testflow.controller';
import { TestflowService } from './testflow.service';
import { HttpModule } from '../http/http.module';
import { DecodeTestflow } from 'src/utils/decode-testflow';

@Module({
  imports: [HttpModule],
  controllers: [TestflowController],
  providers: [TestflowService, DecodeTestflow],
})
export class TestflowModule {}
