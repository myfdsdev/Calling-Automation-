/**
 * Seed a demo account so the app has something to look at immediately.
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { generateScript } from '../services/gemini.service.js';
import * as vapi from '../services/vapi.service.js';
import { DEFAULT_VOICE } from '../config/voices.js';

const DEMO_EMAIL = 'demo@leadcall.ai';
const DEMO_PASSWORD = 'demo12345';

async function run() {
  await connectDb();

  await User.deleteOne({ email: DEMO_EMAIL });
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const user = await User.create({
    name: 'Demo User',
    email: DEMO_EMAIL,
    companyName: 'BrightPixel Studio',
    passwordHash,
  });

  const script = await generateScript({
    companyName: 'BrightPixel Studio',
    serviceName: 'Website redesign',
    callGoal: 'Book a 15-minute consultation',
    targetCustomer: 'Local restaurants and cafes',
    offerDescription: 'A modern, mobile-friendly website that brings in more customers.',
  });

  const agent = await Agent.create({
    userId: user._id,
    name: 'Riley — Web Redesign',
    companyName: 'BrightPixel Studio',
    serviceName: 'Website redesign',
    language: 'en-US',
    voiceId: DEFAULT_VOICE,
    callGoal: 'Book a 15-minute consultation',
    targetCustomer: 'Local restaurants and cafes',
    introduction: 'BrightPixel Studio builds modern websites for local businesses.',
    offerDescription: 'A mobile-friendly website that brings in more customers.',
    ...script,
    status: 'active',
  });
  agent.vapiAssistantId = await vapi.upsertAssistant(agent);
  await agent.save();

  console.log('\n  Seeded demo account:');
  console.log(`    email:    ${DEMO_EMAIL}`);
  console.log(`    password: ${DEMO_PASSWORD}`);
  console.log(`    agent:    ${agent.name}\n`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
