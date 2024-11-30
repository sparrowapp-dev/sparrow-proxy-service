import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from './http.service';
import { Request, Response } from 'express';

@Controller('proxy')
export class HttpController {
  constructor(private readonly httpService: HttpService) {}

  @Post('http-request')
  async handleHttpRequest(
    @Body('url') url: string,
    @Body('method') method: string,
    @Body('headers') headers: string,
    @Body('body') body: any,
    @Body('contentType') contentType: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const response = await this.httpService.makeHttpRequest({
        url,
        method,
        headers,
        body,
        contentType,
      });

      // Set the response headers and status
      // response.headers.forEach((value, key) => {
      //   // res.setHeader(key, value);
      // });

      return res.status(200).send(response);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }
}
