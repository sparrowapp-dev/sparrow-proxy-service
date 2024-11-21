import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('Health')
@Controller()
export class AppController {
  constructor() {}

  @Get('health')
  @ApiOperation({
    summary: 'Health Check',
    description: 'Checks if the server is running',
  })
  @HttpCode(200)
  healthCheck(): { status: string } {
    return { status: 'OK' };
  }
}
