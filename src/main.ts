import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  // Enable CORS for all routes
  app.enableCors();

  // Start listening for HTTP and WebSocket connections
  await app.listen(3000);
  console.log('NestJS app is running on http://localhost:3000');
}
bootstrap();
