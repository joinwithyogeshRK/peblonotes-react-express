import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://peblo:peblo_password@localhost:5432/peblonotes',
  jwtSecret: process.env.JWT_SECRET || 'local-dev-secret-change-me',
  cookieName: process.env.COOKIE_NAME || 'peblo_session',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmApiUrl: process.env.LLM_API_URL || '',
  llmModel: process.env.LLM_MODEL || ''
};
