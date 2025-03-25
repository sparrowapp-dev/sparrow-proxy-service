import { Module } from '@nestjs/common';
import { GraphqlController } from './graphql.controller';
import { GraphqlService } from './graphql.service';
import { HttpModule as NestHttpModule } from '@nestjs/axios';

@Module({
  imports: [NestHttpModule],
  controllers: [GraphqlController],
  providers: [GraphqlService],
})
export class GraphqlModule {}
