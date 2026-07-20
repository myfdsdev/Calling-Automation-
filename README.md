# LeadCall AI

A small, focused Micro-SaaS that lets users create an AI calling agent, find local
business leads, automatically select the best ones, and place automated outbound
calls — then review leads, call history, transcripts, recordings and outcomes from
one clean dashboard.

> Scope is intentionally lightweight. This is **not** a CRM or a full voice-agent
> platform. See the product spec for the exact feature boundary.

## Tech stack

**Frontend** — React + Vite (JavaScript), Tailwind CSS, shadcn/ui-style components,
Radix UI, Lucide icons, React Router, TanStack Query, React Hook Form, Zod, Axios,
Recharts, Sonner.

**Backend** — Node.js, Express, MongoDB + Mongoose, JWT auth, bcryptjs, Zod, Helmet,
CORS, Express Rate Limit.

**Integrations** — Gemini (scripts, lead scoring, call analysis), Vapi (voice calls),
Twilio number imported into Vapi, SerpAPI (Google Maps engine) for local business
leads, optional Cloudinary/R2 for recordings.

All private API keys stay on the backend and are never exposed to the browser.

## Repository layout

```
.
├── backend/     Express API, Mongoose models, integrations, automation runner
└── frontend/    Vite + React SPA
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in what you have (works with mocks if empty)
npm install
npm run dev               # http://localhost:5000
```

If `MONGODB_URI` is not reachable the server logs a warning and stays up so you can
still inspect routes; connect a MongoDB (local or Atlas) for full functionality.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL defaults to http://localhost:5000/api
npm install
npm run dev               # http://localhost:5173
```

## Graceful degradation (demo mode)

Every external integration has a safe fallback so the app is fully runnable without
paid accounts:

| Integration    | With key                         | Without key (demo)                     |
| -------------- | -------------------------------- | -------------------------------------- |
| Gemini         | Real Gemini API                  | Deterministic local script / scoring   |
| Vapi           | Real outbound calls + webhooks   | Simulated call lifecycle + fake report |
| SerpAPI        | Google Maps local business search | Synthetic but realistic local leads    |

This keeps the full product flow demonstrable end-to-end offline.

## Core flow

```
Register / Login
 → Create AI Calling Agent
 → Enter Business Category + Location → Find Leads
 → AI filters & selects valid leads
 → Start Automated Calling (sequential queue)
 → Results saved (transcript, recording, outcome)
 → Review Leads & Calls
```
