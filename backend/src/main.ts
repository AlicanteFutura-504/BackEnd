import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Punto de entrada principal de la aplicación NestJS.
 * Inicializa el servidor, configura CORS, la validación global y Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite peticiones desde el frontend (puerto 3001) hacia este backend
  app.enableCors({
    origin: 'http://localhost:3001',
  });

  // Aplica validación estricta de DTOs en todas las rutas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina atributos no definidos en el DTO
      transform: true, // Intenta convertir tipos de datos automáticamente
      forbidNonWhitelisted: true, // Lanza error si llegan atributos no permitidos
    }),
  );

  // Configuración de la documentación interactiva Swagger
  const config = new DocumentBuilder()
    .setTitle('Booking Management API')
    .setDescription('API MVP para gestión de reservas de comercios')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Arranca el servidor en el puerto 3000
  await app.listen(3000);
}
bootstrap();