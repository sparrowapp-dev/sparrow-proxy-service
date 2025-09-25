import { Module } from '@nestjs/common';
import { SocketIoModule } from './socketio/socketio.module';
import { HttpModule } from './http/http.module';
import { WebSocketModule } from './websocket/websocket.module';
import { GraphqlModule } from "./graphql/graphql.module";
import { TestflowModule } from './testflow/testflow.module';

@Module({
  imports: [HttpModule, SocketIoModule, WebSocketModule, GraphqlModule,TestflowModule],
})
export class ProxyModule {}
