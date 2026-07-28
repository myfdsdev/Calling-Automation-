import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env, features } from './config/env.js';
import { resumeRunningAutomations, resumePendingCalls } from './services/automation.service.js';

async function bootstrap() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`\n  LeadCall AI API running on http://localhost:${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);
    console.log('  Integrations:');
    console.log(`    - Gemini:        ${features.gemini ? 'live' : 'fallback (no key)'}`);
    console.log(`    - Lead provider: ${features.leadProvider ? 'serpapi (Google Maps)' : 'synthetic (no key)'}`);
    console.log(`    - Vapi:          ${features.vapi ? 'live (platform account)' : 'not configured'}`);
    console.log('    - Twilio:        per-user — each user connects their own number in API Settings');

    if (features.vapi && !env.vapi.serverUrl) {
      console.warn(
        '\n  [warn] VAPI_SERVER_URL is not set. Calls will start but transcripts,\n' +
          '         recordings and outcomes cannot be delivered back. Set it to a public\n' +
          '         HTTPS URL of this server (e.g. `ngrok http 5000`).',
      );
    }
    if (env.demoMode) {
      console.warn(
        '\n  [warn] DEMO_MODE is ON — calls are SIMULATED with fabricated transcripts.\n' +
          '         Set DEMO_MODE=false for real calling.',
      );
    } else if (!features.vapi) {
      console.warn(
        '\n  [warn] Calling is disabled — VAPI_PRIVATE_KEY is missing. Starting an\n' +
          '         automation returns a clear error rather than faking calls.',
      );
    }
    if (!process.env.CREDENTIALS_SECRET) {
      console.warn(
        '\n  [warn] CREDENTIALS_SECRET is not set — falling back to JWT_SECRET to encrypt\n' +
          '         users\' Twilio auth tokens. Set a dedicated value before production.',
      );
    }
    console.log('');
  });

  // A busy port is a normal thing to hit in dev (an old instance still running).
  // Explain it instead of dumping an unhandled 'error' event stack trace.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n  Port ${env.port} is already in use — something else is listening there.\n\n` +
          '  Most likely an earlier instance of this server is still running.\n' +
          '  Fix it with either:\n' +
          `    • Windows : netstat -ano | findstr :${env.port}    then  taskkill /F /PID <pid>\n` +
          `    • macOS/Linux: lsof -ti:${env.port} | xargs kill -9\n` +
          `    • Or run on another port:  PORT=5001 npm run dev\n`,
      );
    } else {
      console.error('\n  Server failed to start:', err.message, '\n');
    }
    process.exit(1);
  });

  // Re-attach queue runners and in-flight call pollers after the server is
  // listening (non-blocking).
  resumeRunningAutomations();
  resumePendingCalls();
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
