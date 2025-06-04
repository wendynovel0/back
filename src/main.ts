import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { BooleanToStringInterceptor } from './interceptors/boolean-to-string.interceptor';
import { FormatResponseInterceptor } from './interceptors/format-response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalInterceptors(
    new FormatResponseInterceptor(),
    new BooleanToStringInterceptor()
  );

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true })
  );


  const config = new DocumentBuilder()
    .setTitle('Hoken API')
    .setDescription('API para el sistema Hoken')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Aplicación ejecutándose en ${process.env.BACKEND_URL || 'http://localhost:' + port}`);
}

bootstrap();
