import 'reflect-metadata';
import { Logger, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import pino from 'pino';
import { AppModule } from './app.module';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

class PinoLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    logger.info({ message, optionalParams });
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    logger.error({ message, optionalParams });
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    logger.warn({ message, optionalParams });
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    logger.debug({ message, optionalParams });
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    logger.trace({ message, optionalParams });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(new PinoLogger());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix('v1');

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN') ?? '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((value) => value.trim()),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Mundo de Aprendizado API')
    .setDescription('API do jogo de aprendizado 3D')
    .setVersion('1.0')
    .addServer('/v1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  const port = configService.get<number>('API_PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`API rodando em http://localhost:${port}/v1`, 'Bootstrap');
  Logger.log(`Swagger em http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
