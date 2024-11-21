import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  /**
   * The url endpoint for open api ui
   * @type {string}
   */
  const SWAGGER_API_ROOT = 'api/docs';
  /**
   * The name of the api
   * @type {string}
   */
  const SWAGGER_API_NAME = 'API';
  /**
   * A short description of the api
   * @type {string}
   */
  const SWAGGER_API_DESCRIPTION = 'API Description';
  /**
   * Current version of the api
   * @type {string}
   */
  const SWAGGER_API_CURRENT_VERSION = '1.0';

  // Configure Swagger options for API documentation
  const options = new DocumentBuilder()
    .setTitle(SWAGGER_API_NAME)
    .setDescription(SWAGGER_API_DESCRIPTION)
    .setVersion(SWAGGER_API_CURRENT_VERSION)
    .addBearerAuth() // Add bearer token authentication to Swagger
    .build();
  const document = SwaggerModule.createDocument(app, options);

  // Setup Swagger UI endpoint
  SwaggerModule.setup(SWAGGER_API_ROOT, app, document);

  // Enable CORS for all routes
  app.enableCors();

  // Start listening for HTTP and WebSocket connections
  await app.listen(3000);
  console.log('NestJS app is running on http://localhost:3000');
}
bootstrap();
