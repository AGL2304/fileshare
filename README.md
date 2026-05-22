# 📁 FileShare — File Upload & Sharing System

Application web complète de partage de fichiers avec authentification JWT, upload sécurisé et génération de liens de partage.

## Stack

| Couche     | Technologie                                   |
|------------|-----------------------------------------------|
| Frontend   | React 18 · TypeScript · Vite · TailwindCSS    |
| Backend    | Node.js · Fastify · Prisma ORM                |
| Base de données | PostgreSQL 16                            |
| Cache      | Redis 7                                       |
| Stockage   | Local (dev) / S3-compatible (prod)            |
| Auth       | JWT (access 15min) + Refresh token (7j)       |

## Structure du projet

```
fileshare/
├── backend/
│   ├── src/
│   │   ├── app.ts                  ← Entrée Fastify
│   │   ├── config/
│   │   │   ├── index.ts            ← Variables d'env typées
│   │   │   └── prisma.ts           ← Client Prisma singleton
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      ← /api/v1/auth/*
│   │   │   ├── file.routes.ts      ← /api/v1/files/*
│   │   │   ├── share.routes.ts     ← /api/v1/shares/*
│   │   │   └── folder.routes.ts    ← /api/v1/folders/*
│   │   ├── services/
│   │   │   ├── auth.service.ts     ← Register, login, refresh
│   │   │   ├── file.service.ts     ← Upload, list, delete
│   │   │   ├── share.service.ts    ← Création et résolution de liens
│   │   │   └── storage.service.ts  ← Abstraction Local/S3
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts  ← JWT verify, role check
│   │   └── types/index.ts
│   ├── prisma/
│   │   ├── schema.prisma           ← Modèle de données
│   │   └── migration.sql           ← Migration SQL initiale
│   ├── .env.example
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/index.ts            ← Axios client + interceptors refresh
│   │   ├── store/auth.store.ts     ← Zustand auth state
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx        ← Login / Register
│   │   │   ├── DashboardPage.tsx   ← Vue principale fichiers
│   │   │   ├── SharesPage.tsx      ← Gestion des liens partagés
│   │   │   └── SharePage.tsx       ← Page publique d'accès partagé
│   │   ├── components/
│   │   │   ├── files/
│   │   │   │   ├── UploadDropzone.tsx
│   │   │   │   └── FileList.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── utils/format.ts
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

## Démarrage rapide

### 1. Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour le dev local sans Docker)

### 2. Avec Docker (recommandé)

```bash
# Cloner et démarrer
docker compose up -d

# La base de données est initialisée automatiquement
# via docker-entrypoint-initdb.d/001_init.sql
```

Accès :
- Frontend : http://localhost:5174
- Backend API : http://localhost:3001
- Compte admin par défaut : `admin@fileshare.local` / `Admin1234`
- Le seed admin tourne en `idempotent` au démarrage (modifiable via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### 3. Dev local (sans Docker)

**PostgreSQL requis** (ex: via Docker seul) :
```bash
docker run -d \
  --name fileshare_pg \
  -e POSTGRES_USER=fileshare \
  -e POSTGRES_PASSWORD=fileshare_pass \
  -e POSTGRES_DB=fileshare_db \
  -p 5432:5432 \
  postgres:16-alpine
```

**Backend** :
```bash
cd backend
cp .env.example .env
# Remplir les variables dans .env

npm install
npm run db:migrate      # Applique la migration SQL
npm run db:generate     # Génère le client Prisma
npm run dev             # Démarre en mode watch (ts-node)
```

**Frontend** :
```bash
cd frontend
npm install
npm run dev
```

## Variables d'environnement backend

| Variable               | Défaut          | Description                          |
|------------------------|-----------------|--------------------------------------|
| `DATABASE_URL`         | —               | URL PostgreSQL (obligatoire)         |
| `JWT_SECRET`           | —               | Secret pour access tokens (obligatoire) |
| `JWT_REFRESH_SECRET`   | —               | Secret pour refresh tokens (obligatoire) |
| `PORT`                 | `3001`          | Port du serveur                      |
| `CORS_ORIGIN`          | `http://localhost:5173` | Origine autorisée par CORS   |
| `STORAGE_TYPE`         | `local`         | `local` ou `s3`                      |
| `STORAGE_LOCAL_PATH`   | `./uploads`     | Chemin stockage local                |
| `MAX_FILE_SIZE_BYTES`  | `104857600`     | 100 Mo                               |

## API Reference

### Auth
| Méthode | Endpoint              | Auth | Description          |
|---------|-----------------------|------|----------------------|
| POST    | `/api/v1/auth/register` | —  | Inscription          |
| POST    | `/api/v1/auth/login`    | —  | Connexion            |
| POST    | `/api/v1/auth/refresh`  | —  | Renouveler tokens    |
| DELETE  | `/api/v1/auth/logout`   | ✓  | Déconnexion          |
| GET     | `/api/v1/auth/me`       | ✓  | Profil courant       |

### Fichiers
| Méthode | Endpoint                 | Auth | Description          |
|---------|--------------------------|------|----------------------|
| POST    | `/api/v1/files`          | ✓   | Upload (multipart)   |
| GET     | `/api/v1/files`          | ✓   | Liste paginée        |
| GET     | `/api/v1/files/:id`      | ✓   | Métadonnées          |
| GET     | `/api/v1/files/:id/download` | ✓ | Télécharger        |
| DELETE  | `/api/v1/files/:id`      | ✓   | Supprimer            |

### Partages
| Méthode | Endpoint                    | Auth | Description              |
|---------|-----------------------------|------|--------------------------|
| POST    | `/api/v1/shares`            | ✓   | Créer un lien de partage |
| GET     | `/api/v1/shares`            | ✓   | Mes liens                |
| GET     | `/api/v1/shares/:token`     | —   | Info publique (sans mdp) |
| POST    | `/api/v1/shares/:token/resolve` | — | Résoudre avec mdp (body) |
| POST    | `/api/v1/shares/:token/download` | — | Télécharger (mdp en body) |
| DELETE  | `/api/v1/shares/:id`        | ✓   | Révoquer                 |

### Dossiers
| Méthode | Endpoint              | Auth | Description     |
|---------|-----------------------|------|-----------------|
| GET     | `/api/v1/folders`     | ✓   | Liste dossiers  |
| POST    | `/api/v1/folders`     | ✓   | Créer dossier   |
| DELETE  | `/api/v1/folders/:id` | ✓   | Supprimer       |

## Sécurité

- Mots de passe hashés avec **bcrypt** (12 rounds)
- Tokens JWT signés (access 15min, refresh 7j avec rotation)
- Validation MIME côté serveur (whitelist)
- Rate limiting : 100 req/min par IP
- CORS strict avec origine configurable
- En production : activer le scan antivirus avant `status = READY`

## Roadmap

- [ ] Upload multipart chunked (reprise réseau)
- [ ] Prévisualisation images/PDF
- [ ] Scan antivirus (ClamAV)
- [ ] Thumbnails images
- [ ] OAuth2 Google / GitHub
- [ ] Notifications email
- [ ] Stockage S3 (AWS / MinIO / R2)
- [ ] WebSocket notifications temps réel
- [ ] Console admin
