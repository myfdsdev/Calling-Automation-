import { Router } from 'express';
import authRoutes from './auth.routes.js';
import agentRoutes from './agent.routes.js';
import leadRoutes from './lead.routes.js';
import automationRoutes from './automation.routes.js';
import callRoutes from './call.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import webhookRoutes from './webhook.routes.js';
import { features } from '../config/env.js';
import { isDbConnected } from '../config/db.js';

const router = Router();

router.get('/health', (_req, res) => {
  // Report the database explicitly — otherwise a server with no DB looks "ok"
  // right up until the first real request fails.
  const dbConnected = isDbConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    features,
  });
});

router.use('/auth', authRoutes);
router.use('/agents', agentRoutes);
router.use('/leads', leadRoutes);
router.use('/automations', automationRoutes);
router.use('/calls', callRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
