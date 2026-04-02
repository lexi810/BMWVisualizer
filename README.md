# BMW Battery Intelligence Dashboard

Internal research tool for BMW's battery technology team to track US/Canada battery companies, partnerships, news, and conference proceedings.

## Quick Start

```bash
# 1. Copy and fill in your API keys
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and PERPLEXITY_API_KEY

# 2. Run everything
bash run.sh
```

Dashboard opens at **http://localhost:5173** · API docs at **http://localhost:8000/docs**

## Production (single server)

The API serves the built Vite app from `frontend/dist` when that folder exists, so the UI and `/api` share one origin (no dev proxy required).

```bash
cd frontend && npm ci && npm run build && cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** (API docs: `/docs`). Set `CORS_ORIGINS` to your public site URL if the frontend is hosted on a different domain than the API.

**Docker** (builds the frontend inside the image):

```bash
docker build -t bmw-battery-dashboard .
docker run --rm -p 8000:8000 \
  -e ANTHROPIC_API_KEY=... \
  -e TAVILY_API_KEY=... \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/uploads:/app/uploads" \
  bmw-battery-dashboard
```

Persist the SQLite file by mounting a file or setting `DATABASE_URL` to a path on a mounted volume (for example `sqlite:////data/battery_intel.db`).

## Architecture

- **Backend**: FastAPI + SQLite (SQLAlchemy) on port 8000
- **Frontend**: React + Vite + Tailwind CSS on port 5173
- **AI**: Claude (`claude-sonnet-4-20250514`) + Perplexity for web search
- **Data**: NAATBatt XLSX (auto-downloaded from NREL on first run)

## Features

| Tab | Description |
|-----|-------------|
| Company Map | Leaflet map, markers color-coded by company type |
| Company Table | Searchable/sortable/paginated list, detail panel |
| News Feed | Filterable news headlines by category/company/date |
| Partnership Network | Force-directed graph of company partnerships |
| Research Panel | Discover companies, AI research, CSV/PDF upload |
| Conference Proceedings | Extracted papers, presentations, transcripts |

## NAATBatt Sync

- Auto-downloads on first run from NREL/NLR
- Weekly refresh every Sunday 02:00 AM (APScheduler)
- Manual sync via "Sync Now" button in navbar
- `GET /api/sync/status` · `POST /api/sync/naatbatt`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `PERPLEXITY_API_KEY` | Perplexity sonar API key |
| `DATABASE_URL` | SQLite path (default: `sqlite:///./battery_intel.db`) |
| `UPLOAD_DIR` | Upload directory (default: `./uploads`) |
| `CORS_ORIGINS` | Comma-separated allowed origins, or `*` (see `.env.example`) |

## API Routes

```
GET  /api/companies          List/filter companies
GET  /api/companies/{id}     Company detail + news + proceedings
GET  /api/companies/map      Map markers
GET  /api/companies/network  Partnership graph {nodes, links}
POST /api/companies/research AI research a company
POST /api/companies/discover AI discover new companies

GET  /api/news               List/filter news
POST /api/news/search        AI news search

GET  /api/proceedings        List/filter proceedings

POST /api/upload/csv         Import CSV/XLSX
POST /api/upload/document    Extract from PDF/text via Claude

GET  /api/jobs/{id}          Poll job status
GET  /api/jobs               Recent jobs

GET  /api/sync/status        Last sync info
POST /api/sync/naatbatt      Trigger manual sync

POST /api/seed               Trigger seed import
GET  /api/seed/status        Seed status
```
