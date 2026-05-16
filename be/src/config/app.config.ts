import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  enableSwagger: process.env.ENABLE_SWAGGER === 'true',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
}));
