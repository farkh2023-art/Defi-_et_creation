# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Python 3.13 / FastAPI)

```powershell
# Setup (run once from project root)
python -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
copy .env.example .env

# Start (from backend/ with venv active)
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Tests — must run from backend/ with venv active (pytest needs app/ on sys.path)
cd backend
python -m pytest tests/ -v
python -m pytest tests/test_backtester.py -v   # single file
```

### Frontend (Node 20 / React / Vite)

```powershell
cd frontend
npm install
npm run dev       # dev server :5173
npm run build     # production build (also runs tsc)
npm run lint      # ESLint over .ts/.tsx
```

### All-in-one (Windows)

```powershell
.\scripts\start_all.ps1
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## Architecture

```
backend/app/
  main.py              ← FastAPI app + DB init + CORS
  core/config.py       ← pydantic-settings (reads .env)
  core/logging.py      ← logging setup
  db/database.py       ← SQLAlchemy engine + SessionLocal + Base
  models/__init__.py   ← IMPORTANT: imports all models so SQLAlchemy resolves forward refs
  models/strategy.py   ← Strategy table
  models/version.py    ← StrategyVersion table
  models/backtest.py   ← Backtest table
  models/report.py     ← Report table
  schemas/             ← Pydantic v2 request/response schemas
  api/
    routes_strategies.py   ← /api/strategies/** (generate, CRUD, versions, templates)
    routes_ai.py           ← /api/pine/debug, /api/pine/recommend, /api/pine/status
    routes_backtests.py    ← /api/backtests/run, /import, /compare
    routes_optimization.py ← /api/optimization/run
    routes_reports.py      ← /api/reports/generate, download
  services/
    ai_provider.py     ← AIProvider ABC + MockProvider + OpenAIProvider + AnthropicProvider
    backtester.py      ← vectorized backtest (yfinance real data + synthetic fallback)
    optimizer.py       ← grid search over param_ranges
    pine_generator.py  ← wraps ai_provider + template dispatcher
    pine_debugger.py   ← wraps ai_provider.debug_script
    report_generator.py← Markdown report builder
  templates/           ← sma.py, rsi.py, adx.py, supertrend.py, combined.py
                         each exports: generate(**params)->str, PARAMS_SCHEMA, INDICATORS, DESCRIPTION

frontend/src/
  App.tsx              ← React Router routes
  main.tsx             ← QueryClient + BrowserRouter providers
  api/                 ← typed fetch wrappers (client.ts, strategies.ts, backtests.ts, etc.)
  types/index.ts       ← all shared TypeScript interfaces
  components/          ← Layout (sidebar), StrategyCard, BacktestChart, OptimizationTable, RiskDisclaimer
  pages/               ← Dashboard, GenerateStrategy, TemplatesPage, StrategyEditorPage, DebugStrategy,
                         BacktestPage, OptimizePage, ComparePage, ReportsPage, SettingsPage
```

## API surface

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/strategies/templates` | List all templates |
| GET | `/api/strategies/templates/{key}` | Template schema + params |
| POST | `/api/strategies/templates/{key}/generate` | Pine Script from template |
| POST | `/api/strategies/generate` | AI-generate strategy + persist |
| GET/DELETE | `/api/strategies/{id}` | CRUD on a strategy |
| GET/POST | `/api/strategies/{id}/versions` | Version history |
| POST | `/api/backtests/run` | Local vectorized backtest |
| POST | `/api/backtests/import` | Import TradingView results |
| POST | `/api/backtests/compare` | A/B comparison |
| POST | `/api/optimization/run` | Grid search over param_ranges |
| POST | `/api/pine/debug` | Static + AI lint/correct |
| POST | `/api/pine/recommend` | AI parameter recommendations |
| GET | `/api/pine/status` | Active AI provider |
| POST | `/api/reports/generate` | Markdown report |

## Key design decisions

- **Models `__init__.py`** must import all models — SQLAlchemy 2.0 resolves `Mapped["ClassName"]` forward refs at mapper configuration time, which requires all classes to be in memory.
- **AI Provider pattern**: `get_ai_provider()` factory picks Mock/OpenAI/Anthropic based on `AI_PROVIDER` env var. Mock always works without any API key and keyword-detects a template from the prompt.
- **Database**: SQLite (`backend/tradegpt.db`, created automatically on first start). No migration tooling — schema is created via `Base.metadata.create_all` at startup.
- **Backtester data**: tries yfinance first (1 year BTC-USD daily), falls back to synthetic numpy random-walk if offline. The optimizer runs synchronously inside the HTTP request and caps at 200 combinations by default.
- **`equity_curve` field**: stored as a JSON string in the DB and returned as a JSON string from the API — callers must `JSON.parse` it before use.
- **Frontend Pine Script editor**: uses Monaco Editor (`@monaco-editor/react`). Charts use Recharts.
- **Frontend proxy**: Vite proxies `/api` → `localhost:8000` in dev. Nginx proxies in Docker.
- **Python version**: tested on Python 3.13. Do not pin pydantic < 2.9 (wheels missing for 3.13).

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
