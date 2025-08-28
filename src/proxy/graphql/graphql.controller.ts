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
import { GraphqlService } from './graphql.service';
import { Request, Response } from 'express';

@Controller('proxy')
export class GraphqlController {
  constructor(private readonly graphqlService: GraphqlService) {}

  @Post('graphql-request')
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
      const response = await this.graphqlService.makeGraphqlRequest({
        url,
        method,
        headers,
        body,
        contentType,
      });

      return res.status(200).send(response);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }
}
