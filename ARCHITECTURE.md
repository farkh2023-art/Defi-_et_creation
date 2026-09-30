# Architecture — TradeGPT BTC Optimizer

## Vue d'ensemble

```
Frontend (React/Vite :5173)  ──proxy──►  Backend (FastAPI :8000)  ──►  SQLite
                                                     │
                                              AIProvider
                                         ┌──────┬──────┬──────┐
                                         │ Mock │ OpenAI│ Anthropic│
                                         └──────┴──────┴──────┘
```

## Backend (Python/FastAPI)

### Couches

| Couche | Rôle |
|--------|------|
| `api/` | Routes HTTP (FastAPI routers) |
| `services/` | Logique métier (backtester, optimizer, etc.) |
| `templates/` | Pine Script v5 paramétrables |
| `models/` | Tables SQLAlchemy (Strategy, StrategyVersion, Backtest, Report) |
| `schemas/` | Validation Pydantic des entrées/sorties API |
| `db/` | Connexion SQLite, SessionLocal |
| `core/` | Config (pydantic-settings), Logging |

### Flux génération de stratégie

```
POST /api/strategies/generate
  → pine_generator.generate_strategy(prompt, template, risk_profile)
  → AIProvider.generate_strategy()  [mock | openai | anthropic]
  → Création Strategy + StrategyVersion en DB
  → Retour pine_script, parameters, explanation
```

### Flux backtest

```
POST /api/backtests/run
  → backtester.run_backtest(template, params, capital)
  → _fetch_btc_data()  [yfinance ou synthétique]
  → _signals_xxx(df, params)  → buy/sell signals
  → simulation trade-by-trade avec stop loss / take profit
  → calcul métriques : return, win_rate, drawdown, sharpe
  → Création Backtest en DB
```

## Frontend (React/TypeScript/Vite)

### Pages

| Route | Page | Fonction |
|-------|------|----------|
| `/` | Dashboard | Vue globale, stats, stratégies récentes |
| `/generate` | GenerateStrategy | Prompt → Pine Script via IA |
| `/templates` | TemplatesPage | 5 templates préconstruits |
| `/editor` | StrategyEditorPage | Monaco Editor + versioning |
| `/debug` | DebugStrategy | Analyse et correction Pine Script |
| `/backtest` | BacktestPage | Simulation locale + courbe d'équité |
| `/optimize` | OptimizePage | Grid search paramètres |
| `/compare` | ComparePage | Comparaison A/B deux stratégies |
| `/reports` | ReportsPage | Génération/téléchargement Markdown |
| `/settings` | SettingsPage | État IA, instructions .env |

### Gestion d'état

- **TanStack Query** : cache et synchronisation des données serveur.
- **useState local** : formulaires et états UI temporaires.
- Pas de store global (Redux/Zustand) : les pages sont indépendantes.

## Backtester local

Implémenté en Python pur (pandas/numpy), sans bibliothèque de backtesting externe.

Signaux vectorisés → simulation séquentielle trade par trade → métriques finales.

Données : yfinance (BTC-USD, 1 an, daily) avec fallback synthétique si hors ligne.

## Fournisseur IA

Pattern Strategy — sélection à l'initialisation via `AI_PROVIDER` env var.

```python
get_ai_provider() → MockProvider | OpenAIProvider | AnthropicProvider
```

Le `MockProvider` retourne des réponses préparées basées sur la détection de mots-clés dans le prompt. Il est toujours disponible et rend l'application fonctionnelle sans clé API.
