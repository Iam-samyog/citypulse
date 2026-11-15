# Oracle of Ithaca — Project Configuration Reference

## What this project is

**Oracle of Ithaca** (formerly CityPulse) is a city-operations dashboard demo for a fictional ancient city styled after Homer's Odyssey. It's a digital twin: simulated infrastructure, incidents, and crises you can monitor and actively stress-test.

- **Dashboard** (`/dashboard`, behind login) — Overview, Infrastructure, Incidents, AI Advisors (Athena/Oracle), Simulator command center
- **3D Virtual City** (`/city`) — explorable Three.js model reflecting live infrastructure status
- **3D Crisis Simulator** (`/simulator`) — standalone Three.js app to trigger disasters and watch the city react; runs save to MongoDB
- **Emergency alerts** — citywide incident broadcast via Telegram (text + AI voice note)
- **MongoDB (Atlas)** backs infrastructure, incidents, and simulator history

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| 3D | Three.js / react-three-fiber |
| Database | MongoDB Atlas |
| AI | Google Gemini |
| Notifications | Telegram Bot API, ElevenLabs (text-to-speech) |

## Config file locations

| What | File |
|---|---|
| Secrets / environment variables | `.env.local` (project root — **gitignored, never committed**) |
| Template of required env vars | `.env.example` |
| Next.js build config | `next.config.mjs` |
| TypeScript compiler settings | `tsconfig.json` |
| Tailwind theme | `tailwind.config.ts` |
| PostCSS plugins | `postcss.config.js` |
| Dependencies & npm scripts | `package.json` |
| Dev-server launch command (Claude Code preview) | `.claude/launch.json` |

## Required environment variables (`.env.local`)

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
MONGODB_DB=citypulse

# Google Gemini — powers Athena & Oracle chat
GEMINI_API_KEY=<your-gemini-key>

# Realtime (optional)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Telegram emergency alerts
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
TELEGRAM_CHAT_ID=<your-telegram-chat-id>
# (or TELEGRAM_CHAT_IDS for multiple, comma-separated)

# ElevenLabs — voice announcements for alerts
ELEVENLABS_API_KEY=<your-elevenlabs-key>
ELEVENLABS_VOICE_ID=<your-voice-id>

# Demo sign-in (login page)
DEMO_USERNAME=operator
DEMO_PASSWORD=<choose-a-password>
DEMO_SESSION_SECRET=<random-string-for-signing-session-cookies>
```

## npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the codebase |
| `npm run seed` | Seed infrastructure components + dependencies into MongoDB |
| `npm run seed -- --reset` | Same, plus clear incidents/repairs/events/AI analysis |
| `npm run verify:graph` | Validate the infrastructure dependency graph |

## Getting MongoDB connected

1. Log into [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database** → your cluster → **Connect** → **Drivers** → Node.js
3. Copy the connection string, replace `<password>` with your DB user's actual password (**Database Access** in the sidebar)
4. Paste into `.env.local` as `MONGODB_URI`
5. Under **Network Access**, make sure your IP (or `0.0.0.0/0` for testing) is allowed
6. Run `npm run seed` to populate infrastructure data
