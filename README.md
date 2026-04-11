# BlackLogix

BlackLogix is a security analytics platform prototype focused on tamper-resistant log evidence, analyst workflows, and future blockchain-backed integrity proofing.

This repository currently includes:

- A React + Vite frontend with a landing page, pricing page, analyst auth screens, and analyst dashboard UI
- A Node.js + Express backend with health, analyst auth, and log source endpoints
- A new isolated FastAPI chat backend in `chat-backend/` for Gemini-powered chat
- A PostgreSQL schema for analysts and log sources
- Docker Compose setup for local backend + database development

## Current Progress

Implemented so far:

- Marketing-style product homepage for the BlockLogix concept
- Pricing page with pilot, team, and enterprise plans
- Analyst login and registration UI flows
- Google Sign-In flow from the frontend to the backend with PostgreSQL analyst upsert
- Analyst dashboard UI with source setup panels, alert views, and metrics
- Backend API routes for:
  - `GET /api/health`
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/google`
  - `GET /api/log-sources`
  - `POST /api/log-sources`
- PostgreSQL bootstrap SQL for:
  - `analysts`
  - `log_sources`
- Seeded sample log source record
- Dockerized Postgres + backend startup

Still not wired end-to-end:

- Dashboard metrics, alerts, and evidence data are currently static demo content
- No blockchain integration yet beyond product positioning and UI copy
- No migrations framework or automated test suite yet

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion
- Backend: Node.js, Express, TypeScript, Zod, PostgreSQL, `pg`, `bcryptjs`, Google Auth Library, JWT
- Database: PostgreSQL 16
- Local infra: Docker Compose

## Prerequisites

- Node.js 20.19+ recommended
- npm
- Docker Desktop or Docker Engine

## Project Structure

```text
BlackLogix/
├── chat-backend/
│   ├── app/
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── app.ts
│   │   ├── db.ts
│   │   └── index.ts
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── init/
│       └── 001-init.sql
├── frontend/
│   ├── components/
│   ├── lib/
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Local Development

### 1. Install dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

### 2. Create the backend environment file

From the project root:

```bash
cp backend/.env.example backend/.env
```

### 3. Create the frontend environment file

From the project root:

```bash
cp frontend/.env.example frontend/.env
```

Fill in:

- `VITE_API_URL=http://localhost:4000`
- `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`
- `VITE_CHAT_API_URL=http://localhost:8000`

### 3. Create the chat backend environment file

From the project root:

```bash
cp chat-backend/.env.example chat-backend/.env
```

Fill in:

- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `GEMINI_API_KEY`

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Frontend default URL:

- `http://localhost:5173`

### 4. Run backend + Postgres with Docker

From the project root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- Backend API on `http://localhost:4000`

### 5. Run Postgres in Docker and backend locally

Start Postgres:

```bash
docker compose up postgres
```

If you run the backend outside Docker, update `backend/.env` so `DATABASE_URL` uses `localhost` instead of `postgres`, for example:

```env
DATABASE_URL=postgresql://blacklogix:blacklogix@localhost:5432/blacklogix
```

Then run the backend:

```bash
cd backend
npm run dev
```

### 7. Run the new FastAPI chat backend

```bash
cd chat-backend
docker compose up --build
```

This starts:

- Chat API on `http://localhost:8000`
- Chat PostgreSQL on host port `5433`

### 6. Google Cloud setup

In Google Cloud Console:

1. Configure the OAuth consent screen.
2. Create a `Web application` OAuth Client ID.
3. Add Authorized JavaScript Origins:
   - `http://localhost:5173`
4. Copy the client ID into:
   - `backend/.env` as `GOOGLE_CLIENT_ID`
   - `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`

## Backend Environment Variables

Current backend env file values:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
JWT_SECRET=replace-this-with-a-long-random-secret-at-least-32-chars
DATABASE_URL=postgresql://blacklogix:blacklogix@postgres:5432/blacklogix
```

Notes:

- Use `postgres` as the database host when the backend runs inside Docker
- Use `localhost` as the database host when the backend runs directly on your machine

## API Endpoints

### Health check

```bash
curl http://localhost:4000/api/health
```

### Register analyst

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ava Thompson",
    "email": "ava@example.com",
    "organization": "Northstar Financial",
    "password": "StrongPass123"
  }'
```

### Login analyst

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ava@example.com",
    "password": "StrongPass123"
  }'
```

### Sign in with Google

```bash
curl -X POST http://localhost:4000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "google-id-token-from-the-frontend"
  }'
```

### List log sources

```bash
curl http://localhost:4000/api/log-sources
```

### Create a log source

```bash
curl -X POST http://localhost:4000/api/log-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS CloudTrail",
    "sourceType": "cloud_audit_trail",
    "provider": "AWS CloudTrail",
    "account": "prod-secops-us-east-1",
    "credentialLabel": "cloudtrail-prod",
    "status": "ready"
  }'
```

## Database Schema

The initial SQL bootstrap creates:

- `analysts`
  - analyst identity, optional password storage, Google subject ID, and auth provider
- `log_sources`
  - server and cloud audit trail source configuration

It also seeds one sample `log_sources` row for local development.

## Frontend Routes

Current client-side routes:

- `/` - landing page
- `/pricing` - pricing page
- `/analyst-login` - login page
- `/register` - analyst registration page
- `/dashboard` - analyst dashboard

## Recommended Next Steps

- Persist log source creation from the dashboard into `/api/log-sources`
- Add backend JWT validation middleware for protected API routes
- Add investigations, alerts, evidence, and compliance tables
- Add migrations and automated tests
- Add real blockchain anchoring or verification flows if that remains part of the product direction
