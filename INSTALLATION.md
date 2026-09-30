# Guide d'installation détaillé

## Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| Python | 3.11 | `python --version` |
| pip | 23+ | `pip --version` |
| Node.js | 20 | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.x | `git --version` |

---

## Installation manuelle

### 1. Cloner le projet

```bash
git clone <url> tradegpt-btc-optimizer
cd tradegpt-btc-optimizer
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Éditez .env selon vos besoins (optionnel)
```

### 3. Backend Python

#### Windows

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
```

#### Linux / macOS

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

### 4. Démarrer le backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Vérifiez : http://localhost:8000/health

### 5. Frontend React

```bash
cd frontend
npm install
npm run dev
```

Ouvrez : http://localhost:5173

---

## Installation via Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend : http://localhost:5173
- Backend : http://localhost:8000

---

## Résolution de problèmes

### "ModuleNotFoundError: No module named 'app'"

Vous n'êtes pas dans le bon répertoire. Lancez uvicorn depuis `backend/` :

```bash
cd backend
uvicorn app.main:app --reload
```

### "yfinance" timeout / pas de données

Le backtester utilise des données synthétiques en fallback automatiquement. Aucune action requise.

### Port déjà utilisé

Changez le port :

```bash
uvicorn app.main:app --reload --port 8001
# et ajustez VITE_API_URL dans .env frontend
```

### Erreur CORS

Vérifiez que `CORS_ORIGINS` dans `.env` contient `http://localhost:5173`.
