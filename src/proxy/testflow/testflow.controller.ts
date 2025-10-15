import { 
  Controller, 
  Post, 
  Body, 
  Req, 
  Res, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TestflowService } from './testflow.service';
import { TestflowRunDto } from 'src/payloads/testflow.payload';

@Controller('proxy/testflow')
export class TestflowController {
  constructor(
    private readonly testflowService: TestflowService,
  ) {}

  @Post('/execute')
  async testflowRun(
    @Body() payload: TestflowRunDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.testflowService.runTestflow(payload);
      return res.status(200).send(result);
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to run testflow',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
