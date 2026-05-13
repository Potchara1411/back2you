# Software Design Document — Back2You@KAIST
**CS350 Team 5 | Version 0.1 | May 2026**

## 1. Introduction
Back2You@KAIST is a browser-based Lost & Found web application for KAIST members.
This document describes the architecture, components, and design decisions.

## 2. Architecture Overview
- Frontend: React + Vite (SPA, served statically)
- Backend: Node.js + Express (REST API)
- Database: PostgreSQL
- Auth: KAIST email + OTP (JWT session)
- Image Storage: TBD (Cloudinary or S3)
- Email: Nodemailer

[Architecture diagram to be added]

## 3. Module Breakdown
| Module | Frontend Pages | Backend Routes |
|---|---|---|
| Auth | LoginPage | /api/auth |
| Post Management | CreatePostPage, PostDetailPage | /api/posts |
| Search | SearchPage, HomePage | /api/search |
| Admin | AdminPage | /api/admin |
| Notifications | ProfilePage | /api/notifications |

## 4. API Endpoints (Planned)
### Auth
- POST /api/auth/request-otp   — send OTP to KAIST email
- POST /api/auth/verify-otp    — verify OTP, return JWT
- POST /api/auth/logout        — invalidate session

### Posts
- GET    /api/posts             — list recent posts (paginated)
- GET    /api/posts/:id         — get post detail
- POST   /api/posts             — create new post (auth required)
- PUT    /api/posts/:id         — edit post (owner only)
- DELETE /api/posts/:id         — delete post (owner or admin)
- PATCH  /api/posts/:id/status  — change post status

### Search
- GET /api/search?keyword=&category=&location=&date= — search/filter posts

### Admin
- GET    /api/admin/posts               — list all posts
- DELETE /api/admin/posts/:id           — delete any post
- PATCH  /api/admin/users/:id/block     — block a user
- PATCH  /api/admin/users/:id/unblock   — unblock a user
- GET    /api/admin/reports             — list reported posts

### Notifications
- POST /api/notifications/subscribe     — subscribe to category
- DELETE /api/notifications/unsubscribe — unsubscribe

## 5. Post Status Flow
open → hidden (user or admin)
open → claimed (user)
claimed → pending_resolution (user requests resolution)
pending_resolution → resolved (admin approves)
resolved → open (admin reopens)

## 6. Roles & Permissions
| Action | User | Admin |
|---|---|---|
| Create post | ✓ | ✓ |
| Edit own post | ✓ | ✓ |
| Delete own post | ✓ | ✓ |
| Delete any post | ✗ | ✓ |
| Hide own post | ✓ | ✓ |
| Hide any post | ✗ | ✓ |
| Block user | ✗ | ✓ |
| Manage categories | ✗ | ✓ |
| Approve resolution | ✗ | ✓ |

## 7. Database Schema
See backend/src/models/schema.sql

## 8. CI/CD
- GitHub Actions runs on every PR to dev and main
- Checks: npm install + npm run build (frontend), npm install (backend)
- Branch protection: PRs require 1 approval before merge

## 9. Design Decisions
- KAIST email + OTP chosen over SSO (confirmed with Team 3, feasibility reasons)
- Draft posts saved locally (confirmed with Team 3)
- Matching algorithm: exact category + exact building + date within 3 days
- Max 3 images per post, 15MB total (per Team 3 spec)

## 10. To Be Determined
- Final image hosting provider (Cloudinary vs S3)
- Deployment platform (Vercel + Railway vs other)
- Bookmark feature (pending Team 3 decision)
