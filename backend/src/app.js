import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin / non-browser clients (curl, health checks) send no Origin.
        if (!origin) return callback(null, true);

        const clean = origin.replace(/\/$/, '');
        if (env.clientUrls.includes(clean)) return callback(null, true);

        // Outside production, always permit local dev servers on any port.
        if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) {
          return callback(null, true);
        }

        console.warn(
          `[cors] blocked origin ${origin} — add it to CLIENT_URL (comma-separated) to allow it`,
        );
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!isProd) app.use(morgan('dev'));

  // Global limiter — generous; auth has a tighter one below.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: 'Too many requests. Please slow down.' } },
    }),
  );
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 40,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: 'Too many attempts. Please try again later.' } },
    }),
  );

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
