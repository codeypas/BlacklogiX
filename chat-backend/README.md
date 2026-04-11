# BlackLogix Chat Backend

This service is the new Python chat backend for BlackLogix. It is isolated from the
existing Node backend and uses:

- FastAPI
- LangChain
- Gemini API
- PostgreSQL
- SQLAlchemy
- Google OAuth ID token verification
- JWT authentication
- Docker

## Project structure

```text
chat-backend/
  app/
    main.py
    config.py
    api/
    db/
    schemas/
    services/
    utils/
  .env.example
  Dockerfile
  docker-compose.yml
  requirements.txt
```

## Setup

1. Create the env file:

```bash
cp .env.example .env
```

2. Fill in:

- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` such as `gemini-2.5-flash`

3. Start the backend and PostgreSQL:

```bash
docker compose up --build
```

4. Verify health:

```bash
curl http://localhost:8000/health
```

## Frontend wiring

Point the chat UI to:

```env
VITE_CHAT_API_URL=http://localhost:8000
```

## Notes

- PostgreSQL is exposed on host port `5433` to avoid conflicting with the existing repo database.
- Inside Docker, the app uses `chat-postgres:5432` via the `DATABASE_URL` in `.env`.
- If you run FastAPI locally instead of Docker, use:

```env
DATABASE_URL=postgresql+psycopg://blacklogix:blacklogix@localhost:5433/blacklogix_chat
```
