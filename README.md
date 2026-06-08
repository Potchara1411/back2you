# Back2You@KAIST

A Lost & Found web application for KAIST members — post lost or found items, search and filter them, claim items, and manage everything through an admin panel.

Built for **CS350 Software Engineering, Spring 2026**.

## Team Members
- Potchara Sukrason — Authentication
- Paradee Suwanvong — Post Management
- Na Yoonsu — Home Feed & Search
- Ratchata Rattanakit — Admin Panel


## Features
- **Passwordless login** — one-time code (OTP) sent to your `@kaist.ac.kr` email, JWT-based sessions
- **Post management** — create lost/found posts with up to 3 images, edit, delete, and track status
- **Claim flow** — request to claim a post and resolve it through a status lifecycle
- **Home feed & search** — paginated recent posts, filter by keyword, category, location, and date
- **Admin panel** — manage posts, users, categories, reports, and resolutions
- **Profile** — view your posts and update your display name

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express 5 (REST route modules) |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | JWT + email OTP (Nodemailer) |
| Image hosting | Cloudinary (unsigned upload, base64 fallback) |
| CI | GitHub Actions (build check on every PR) |

## Required Tools
- Git
- Node.js `20.19+` (required by the current Vite setup)
- VS Code (recommended)
- A Supabase account (for a development database)
- A Cloudinary account (optional, for image hosting)

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/Potchara1411/back2you.git
cd back2you
git checkout dev
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env   # then fill in the values below
npm install
npm run dev
```
Backend API runs at **`http://localhost:5001/api`**

**`backend/.env` variables:**
| Variable | Description |
|---|---|
| `PORT` | Backend port (default `5001`) |
| `DATABASE_URL` | Supabase Postgres connection string (use the **transaction pooler**, port `6543`) |
| `DATABASE_SSL` | `true` for Supabase |
| `USE_MOCK_DATA` | `true` to serve mock posts without a database |
| `MOCK_AUTH` | `true` to skip real email and accept a mock OTP (dev only) |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + app password for sending OTP emails |

> The backend serves mock data when `DATABASE_URL` is unset or `USE_MOCK_DATA=true`, so you can start without a database.

### 3. Database (Supabase)
1. Create a Supabase project (Seoul region recommended).
2. In the **SQL Editor**, paste and run `backend/src/models/schema.sql`.
3. Under **Connect → Transaction pooler**, copy the URI and set it as `DATABASE_URL` in `backend/.env`.

> Use the **transaction pooler (port 6543)**, not the session pooler — it handles many more concurrent connections.

### 4. Frontend setup
```bash
cd frontend
cp .env.example .env   # set the Cloudinary values if using image hosting
npm install
npm run dev
```
Frontend app runs at **`http://localhost:5173`**

**`frontend/.env` variables:**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (default `http://localhost:5001/api`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | An **unsigned** Cloudinary upload preset |

> Without Cloudinary configured, images fall back to base64 so the app still works locally.

## API Overview
All protected routes require an `Authorization: Bearer <token>` header.

**Auth** (`/api/auth`)
- `POST /request-otp` — send a one-time code to a KAIST email
- `POST /verify-otp` — verify the code, return a JWT
- `POST /logout` — end the session

**Posts** (`/api/posts`)
- `GET /` — list recent posts (paginated)
- `GET /categories` — list categories
- `POST /` — create a post
- `GET /:id` — post detail
- `PUT /:id` — edit (owner only)
- `DELETE /:id` — delete (owner only)
- `PATCH /:id/status` — change status
- `POST /:id/claims` · `GET /:id/claims` · `PATCH /:id/claims/:claimId` — claim flow

**Search** (`/api/search`)
- `GET /?keyword=&category=&location=&date=` — search and filter

**Users** (`/api/users`)
- `GET /me` · `GET /me/posts` · `PUT /me` — profile and own posts

**Admin** (`/api/admin`)
- Manage posts, reports, resolutions, users, categories, and expiration policy

## Project Structure
```
back2you/
├── backend/
│   └── src/
│       ├── controllers/   # request handlers
│       ├── routes/        # Express route modules
│       ├── middleware/    # auth & admin guards
│       ├── models/        # db pool + schema.sql
│       └── utils/         # mailer
└── frontend/
    └── src/
        ├── pages/         # route pages
        ├── components/    # shared UI
        ├── context/       # AuthContext
        └── services/      # api + cloudinary
```

## Contributing Workflow
Branch protection is enforced on `main` and `dev` — direct pushes are blocked.

1. Branch from `dev`: `git checkout -b feature/your-feature`
2. Commit using prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
3. Push and open a **pull request to `dev`** (not `main`)
4. CI runs an automatic build check; one teammate approval is required to merge

Never commit `.env` files — they are already gitignored.
