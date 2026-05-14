import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { notesRouter } from './routes/notes.js';
import { insightsRouter } from './routes/insights.js';
import { sharedRouter } from './routes/shared.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(config.nodeEnv === 'test' ? 'tiny' : 'dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/insights', insightsRouter);
  app.use('/api/shared', sharedRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  app.use((error, req, res, next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request body.', details: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
