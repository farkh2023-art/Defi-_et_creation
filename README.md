# TradeGPT BTC Optimizer

> **Simulation uniquement — pas un conseil financier.**

Générateur, optimiseur et analyseur de stratégies de trading Bitcoin en **Pine Script v5** pour TradingView.

Fonctionnel **sans clé API** grâce au mode mock intégré.

---

## Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🤖 Génération IA | Prompt naturel → Pine Script v5 (OpenAI / Anthropic / Mock) |
| 📋 Templates | SMA Cross, Supertrend, RSI, ADX, SMA+RSI+ADX Combined |
| ✏️ Éditeur | Monaco Editor + versioning illimité |
| 🐛 Debug | Détection et correction automatique d'erreurs Pine Script |
| 📊 Backtest | Simulation locale sur données BTC historiques (yfinance) |
| 🔧 Optimisation | Grid search sur plages de paramètres |
| ⚖️ Comparaison | A/B test entre deux stratégies |
| 📄 Rapports | Export Markdown complet par stratégie |

---

## Installation rapide

### Prérequis

- Python 3.11+
- Node.js 20+
- (Optionnel) Docker + Docker Compose

### Windows — démarrage rapide

```powershell
# Cloner le projet
git clone https://github.com/farkh2023-art/tradegpt-btc-optimizer.git
cd tradegpt-btc-optimizer

# Backend
python -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
copy .env.example .env

cd backend
python -m uvicorn app.main:app --reload
```

```powershell
# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

Ou en un clic :
```powershell
.\scripts\start_all.ps1
```

### Linux / macOS

```bash
bash scripts/start_all.sh
```

### Docker

```bash
cp .env.example .env
docker compose up --build
```

---

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentation API | http://localhost:8000/docs |

---

## Configuration IA

Éditez `.env` :

```env
# Mode sans clé API (défaut)
AI_PROVIDER=mock

# Avec OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Avec Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Intégration eToro — lecture seule

L'intégration eToro permet d'analyser un portefeuille existant. Elle est strictement en **lecture seule** : aucun ordre d'achat ou de vente n'est jamais envoyé à eToro.

### Garanties de sécurité

- `ETORO_ALLOW_REAL_ORDERS=false` dans `.env` — **ne jamais passer cette valeur à `true`**.
- Le backend lève une erreur fatale au démarrage si cette valeur est modifiée.
- Les clés API ne sont jamais écrites dans les logs.

### Mode mock (défaut)

Fonctionne sans aucune clé API. Un portefeuille fictif BTC-centré est retourné automatiquement.

```env
ETORO_API_ENABLED=false   # mode mock actif
ETORO_PUBLIC_API_KEY=     # laisser vide
ETORO_USER_KEY=           # laisser vide
ETORO_ALLOW_REAL_ORDERS=false
```

### Activer la connexion réelle

```env
ETORO_API_ENABLED=true
ETORO_PUBLIC_API_KEY=votre-clé-publique
ETORO_USER_KEY=votre-user-key
ETORO_ALLOW_REAL_ORDERS=false   # doit rester false
```

### Endpoints disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/etoro/status` | État de la connexion et du mode |
| GET | `/api/etoro/portfolio` | Valeur totale, cash, positions, métriques |
| GET | `/api/etoro/positions` | Liste détaillée des positions |
| POST | `/api/etoro/analyze` | Analyse TradeGPT du portefeuille |

### Interface

Page accessible dans la sidebar : **eToro Portfolio** (`/etoro`).

Affiche : valeur totale · cash · performance · exposition BTC · tableau des positions · graphique de répartition · analyse TradeGPT.

---

## Tests

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m pytest tests/ -v
```

---

## Architecture

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour le détail technique.

## Roadmap

Voir [ROADMAP.md](ROADMAP.md).

## Sécurité

Voir [SECURITY.md](SECURITY.md).

## Disclaimer

Voir [DISCLAIMER.md](DISCLAIMER.md).

---

**Mode paper trading uniquement. Aucun ordre réel n'est jamais exécuté.**
