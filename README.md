# Back2You@KAIST

A Lost & Found web application for KAIST members.
Built for CS350 Software Engineering, Spring 2026.

## Team 5 Members
- Member 1: Potchara Sukrason
- Member 2: Paradee Suwanvong
- Member 3: Ratchata Rattanakit
- Member 4: Na Yoonsu

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Required Tools
- Git
- Node.js `20.19+` recommended for the current Vite setup
- VS Code
- Supabase account for each member's own development database

## Getting Started

### First-time setup

```bash
git clone https://github.com/Potchara1411/back2you.git
cd back2you
git checkout dev
git checkout -b feature/search
```

### Run backend with mock data

The backend returns mock lost-and-found posts when `DATABASE_URL` is not set, so you can work without PostgreSQL at the beginning.

```bash
cd backend
npm install
npm run dev
```

Backend API: `http://localhost:5000/api`

### Run backend with Supabase

Each team member should create their own Supabase project for development.

1. Create a Supabase project named `back2you-dev`.
2. Choose the Northeast Asia / Seoul region if available.
3. In Supabase SQL Editor, paste and run `backend/src/models/schema.sql`.
4. Copy your PostgreSQL connection string.
5. Create `backend/.env` from the example:

```bash
cd backend
cp .env.example .env
```

6. Paste your connection string into `backend/.env` as `DATABASE_URL`.

Never commit `backend/.env`; it is already ignored by Git.

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend app: `http://localhost:5173`

### Member C scope

- `GET /api/posts` lists recent posts with pagination.
- `GET /api/search?keyword=&category=&location=&date=` searches and filters posts.
- Home page shows recent posts as cards.
- Search page supports keyword, category, location, and date filters.
- Empty results show `No items found`.
