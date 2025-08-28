import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    // Increase payload size limit
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

   // Use the custom WebSocket adapter to handle both WS and SocketIo
   app.useWebSocketAdapter(new IoAdapter(app));

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
