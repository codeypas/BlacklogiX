# BlackLogix

BlackLogix is a security analytics and AI telemetry platform prototype focused on:

- structured AI and system event ingestion
- tamper-resistant SHA-256 evidence chaining
- analyst investigation workflows
- alerting and anomaly detection
- compliance-style reporting
- SDK-based pilot integration

The project is designed to help teams collect trustable AI evidence, verify its integrity,
investigate risky behavior, and preserve an auditable event trail.

## What BlackLogix Does

At a high level, the current prototype supports this flow:

Customer application or service  
→ SDK or source API key  
→ FastAPI ingestion API  
→ SHA-256 hashing and source-level chain linking  
→ PostgreSQL event storage  
→ anomaly and alert evaluation  
→ dashboard, replay, integrity verification, and reporting

The current implementation is best suited for:

- AI startups
- AI SaaS products
- enterprise AI applications
- structured application and service telemetry pilots

## Current Architecture

### Primary platform

- `frontend/`
  - React + Vite analyst dashboard and product UI
- `chat-backend/`
  - FastAPI platform backend
  - PostgreSQL storage
  - ingestion, integrity, alerts, reporting, chat copilot
- `sdk/python/blacklogix-agent/`
  - Python ingestion SDK
- `sdk/node/blacklogix-agent/`
  - Node.js ingestion SDK

### Secondary / legacy service still in the repo

- `backend/`
  - older Node.js + Express service
  - still present in the repository
  - not the main implementation for the current monitoring platform

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Framer Motion
- Lucide React

### Primary backend

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Psycopg 3
- JWT authentication
- Google auth verification
- LangChain
- Gemini integration

### Secondary backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- JWT
- Google auth
- Zod

### Integration

- Python SDK
- Node SDK
- direct API ingestion

### Local infrastructure

- Docker Compose

## Implemented Features

### Workspace and tenancy

- organization setup
- project setup
- ingestion source setup
- source API key generation and rotation

### Ingestion

- AI event ingestion API
- system log ingestion API
- bulk ingestion API
- dashboard-based test ingestion
- Python SDK ingestion
- Node SDK ingestion

### Integrity and trust

- SHA-256 raw hashing
- previous-hash chain logic
- chain hash storage
- project integrity summary
- source verification
- legacy hash backfill
- clearer integrity status UX:
  - no chain yet
  - verified
  - backfill required
  - mismatch detected

### Detection and investigation

- rule-based risk detections
- recent-history anomaly heuristics
- background-style alert evaluation
- alert list and detail views
- acknowledge / resolve workflow
- event explorer
- incident replay
- project-aware analyst copilot

### Reporting

- compliance-style report generation
- JSON copy
- CSV export
- backend-generated PDF export

### Pilot readiness

- source-specific onboarding examples in the dashboard
- shared pilot integration guide
- realistic Python and Node SDK examples

## What Is Working Today

You can already do this end to end:

1. Create an organization, project, and source in the dashboard.
2. Copy the source API key.
3. Send AI or system events from the SDK or direct API.
4. Watch those events appear in the dashboard.
5. Verify the SHA-256 chain for the source.
6. Backfill older legacy rows if needed.
7. Trigger alerts with risky events.
8. Replay event details and inspect integrity fields.
9. Generate CSV or PDF compliance-style reports.

## What Is Not Fully Done Yet

The project is a strong prototype, but not yet a full production platform.

Still remaining:

- system-log pilot flow polish
- stronger pipeline hardening
  - retries
  - batching
  - worker separation
  - failure handling
- Redis or queue enforcement as the real processing path
- stronger search/index strategy if scale requires it
- SDK packaging and publishing polish
- broader raw infrastructure log collectors
- ML-based anomaly scoring

## Repository Structure

```text
BlackLogix/
├── backend/                         # older Node/Express service
├── chat-backend/                    # primary FastAPI platform backend
│   ├── app/
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── database/
│   └── init/
├── docs/
│   └── pilot-integration-guide.md
├── frontend/
│   ├── components/
│   ├── lib/
│   ├── src/
│   └── package.json
├── sdk/
│   ├── python/
│   │   └── blacklogix-agent/
│   └── node/
│       └── blacklogix-agent/
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.19+ recommended
- npm
- Python 3.11+
- Docker Desktop or Docker Engine

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Run the FastAPI Platform Backend

```bash
cd chat-backend
cp .env.example .env
docker compose up --build
```

Fill `chat-backend/.env` with:

- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Backend URL:

- `http://localhost:8000`

Health check:

```bash
curl http://localhost:8000/health
```

## Frontend Environment

Create:

```bash
cp frontend/.env.example frontend/.env
```

Recommended values:

```env
VITE_API_URL=http://localhost:4000
VITE_CHAT_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

## Main Pilot Flow

### For a customer or pilot client

1. Open the dashboard.
2. Create or select:
   - organization
   - project
   - source
3. Copy:
   - `project_id`
   - `source_id`
   - `source API key`
4. Choose one ingestion path:
   - Python SDK
   - Node SDK
   - direct API
5. Send AI or system events.
6. Validate:
   - event explorer
   - incident replay
   - integrity verification
   - alerts
   - reports

### For an analyst

1. Select the project and source.
2. Review overview metrics.
3. Open `Event explorer`.
4. Use `Incident replay` to inspect the stored evidence.
5. Run source verification.
6. Backfill legacy hashes if needed.
7. Review and resolve alerts.
8. Generate PDF / CSV reports.
9. Use the analyst copilot for contextual summaries.

## SDKs

### Python SDK

Path:

```text
sdk/python/blacklogix-agent
```

Install locally:

```bash
pip install -e sdk/python/blacklogix-agent
```

Example:

```bash
python sdk/python/blacklogix-agent/examples/send_events.py
```

### Node SDK

Path:

```text
sdk/node/blacklogix-agent
```

Install locally:

```bash
npm install ./sdk/node/blacklogix-agent
```

Example:

```bash
node sdk/node/blacklogix-agent/examples/send-events.mjs
```

## Important Docs

- FastAPI backend setup:
  - [chat-backend/README.md](chat-backend/README.md)
- Pilot onboarding:
  - [docs/pilot-integration-guide.md](docs/pilot-integration-guide.md)
- Python SDK:
  - [sdk/python/blacklogix-agent/README.md](sdk/python/blacklogix-agent/README.md)
- Node SDK:
  - [sdk/node/blacklogix-agent/README.md](sdk/node/blacklogix-agent/README.md)

## Current Status

### Done

- core ingestion
- integrity and backfill
- alerting
- replay
- reporting
- Python SDK
- Node SDK
- analyst dashboard
- pilot onboarding guide

### In progress

- moving from prototype completeness to smoother real pilot usage
- improving system-log onboarding quality
- hardening the real processing path

### Remaining

- production-grade pipeline hardening
- broader collector support
- stronger indexing/search strategy
- ML scoring later if needed

## Notes

- PostgreSQL is the current source of truth for stored event evidence.
- Search is still PostgreSQL-backed in the current prototype.
- Integrity is currently implemented with SHA-256 hash chaining, not blockchain anchoring.
- The root repo still contains an older Node backend alongside the newer FastAPI platform backend.

## Recommended Next Step

The best next implementation step is:

- `system-log pilot flow polish`

That will make the non-AI customer path as smooth as the AI SDK path and improve real pilot usability further.
