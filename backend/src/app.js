import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import documentRoutes from './routes/documents.routes.js';
import permissionRoutes from './routes/permissions.routes.js';
import userRoutes from './routes/users.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import auditRoutes from './routes/audit.routes.js';
import ingestionRoutes from './routes/ingestion.routes.js';
import healthRoutes from './routes/health.routes.js';
import filesRoutes from './routes/files.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';

const app = express();

// See docs/02-system-architecture.md deployment section and the Deployment
// Guide — must be set correctly (not just left at the safe default) for
// rate limiting to key off real client IPs once behind a reverse proxy/LB.
if (env.trustProxy !== false) {
  app.set('trust proxy', env.trustProxy);
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [env.frontendOrigin];
      // In development, also allow 127.0.0.1 if frontendOrigin is localhost, and vice versa
      if (env.nodeEnv === 'development') {
        if (env.frontendOrigin.includes('localhost')) allowedOrigins.push(env.frontendOrigin.replace('localhost', '127.0.0.1'));
        if (env.frontendOrigin.includes('127.0.0.1')) allowedOrigins.push(env.frontendOrigin.replace('127.0.0.1', 'localhost'));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // required so the browser sends the HttpOnly refresh cookie
  })
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(sanitizeInput);

// Global rate limit — generous default, tightened per-route where it matters (e.g. auth).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents', permissionRoutes); // nested under /documents/:id/permissions
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
