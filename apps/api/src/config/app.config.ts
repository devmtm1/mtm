import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
}

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
}));
