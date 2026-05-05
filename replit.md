# Morris Manager

## Overview

A full-stack personal productivity app rebranded as "Morris Manager" / "MORRIS.OS". Combines study tracking, gym tracking, task management, calendar, notes, financial tracking, daily journaling, and an AI assistant.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, Framer Motion, Recharts, react-day-picker, next-themes
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.4, streaming SSE)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Features

1. **Dashboard** — task completion ring, study hours bar, gym streak, motivational quote, upcoming tasks
2. **To-Do List** — CRUD tasks with priority (High/Medium/Low), category (Study/Gym/Personal), deadline, completion toggle
3. **Calendar** — monthly view with task dots, click a date to see tasks
4. **Study Tracker** — log sessions by subject/hours, daily/weekly bar charts, streak counter
5. **Gym Tracker** — log workouts with exercises (sets/reps/weight), streak, activity map
6. **Finance** — Stock Market (Sensex/Nifty 50 with auto-refresh charts), Daily Spend (log + pie chart), Savings, Mutual Fund, and Gold trackers
7. **Journal** — daily entries with mood selector, date-organized list view, create/edit/delete
8. **Notes** — create/edit/delete rich notes with tags and search
9. **AI Assistant** — streaming SSE chat with GPT-5.4, aware of user data; AI suggestions endpoint

## Artifacts

- `artifacts/hemansh-manager` — React+Vite frontend at `/` (package name: `@workspace/hemansh-manager`)
- `artifacts/api-server` — Express API server at `/api`

## DB Schema

Tables: `tasks`, `study_sessions`, `gym_sessions`, `notes`, `conversations`, `messages`, `expenses`, `savings`, `mutual_funds`, `gold`, `journal_entries`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Routes

- `GET/POST /api/tasks` — task list + create
- `GET/PATCH/DELETE /api/tasks/:id` — task CRUD
- `GET/POST /api/study/sessions` — study session list + log
- `GET /api/study/analytics` — streak, hours by day/subject
- `GET/POST /api/gym/sessions` — gym session list + log
- `GET /api/gym/analytics` — streak, weekly/monthly counts, activity map
- `GET/POST /api/notes` — notes list + create
- `GET/PATCH/DELETE /api/notes/:id` — note CRUD
- `GET/POST /api/finance/expenses` — expense list + log
- `DELETE /api/finance/expenses/:id` — delete expense
- `GET/POST /api/finance/savings` — savings list + add
- `DELETE /api/finance/savings/:id` — delete saving
- `GET/POST /api/finance/mutual-funds` — mutual fund list + add
- `DELETE /api/finance/mutual-funds/:id` — delete mutual fund entry
- `GET/POST /api/finance/gold` — gold list + add
- `DELETE /api/finance/gold/:id` — delete gold entry
- `GET/POST /api/journal/entries` — journal entry list + create
- `PATCH/DELETE /api/journal/entries/:id` — journal entry update + delete
- `GET /api/dashboard/summary` — today's overview
- `GET /api/dashboard/motivational-quote` — daily quote
- `GET/POST /api/ai/conversations` — conversation list + create
- `GET/DELETE /api/ai/conversations/:id` — conversation detail + delete
- `POST /api/ai/conversations/:id/messages` — streaming SSE AI chat
- `GET /api/ai/suggestions` — AI productivity suggestions

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
