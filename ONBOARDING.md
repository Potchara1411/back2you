# Back2You@KAIST — Team Onboarding Guide
CS350 Team 5 | Spring 2026

Welcome to the project! Follow this guide to get set up.

---

## Step 1 — Accept GitHub Invite
Check your email for an invitation from GitHub.
Accept it to get access to the repo.

Repo link: https://github.com/Potchara1411/back2you

---

## Step 2 — Install Required Tools
Make sure you have these installed on your computer:

- **Git**: https://git-scm.com/downloads
- **Node.js** (v18 or above): https://nodejs.org
- **VS Code** (recommended): https://code.visualstudio.com

Check if already installed:
```bash
git --version
node --version
npm --version
```

---

## Step 3 — Clone the Repo

```bash
git clone https://github.com/Potchara1411/back2you.git
cd back2you
git checkout dev
```

You should now be on the `dev` branch.

---

## Step 4 — Install Dependencies

Frontend:
```bash
cd frontend
npm install
npm run dev
```
→ Opens at http://localhost:5173

Backend:
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
→ Runs at http://localhost:5000

---

## Step 5 — Daily Git Workflow

**Always start by pulling latest changes from dev:**
```bash
git checkout dev
git pull origin dev
```

**Create your feature branch:**
```bash
git checkout -b feature/your-feature-name
```

**Work on your feature, then commit:**
```bash
git add .
git commit -m "feat: describe what you did"
```

**Push your branch:**
```bash
git push origin feature/your-feature-name
```

**Open a Pull Request on GitHub:**
1. Go to https://github.com/Potchara1411/back2you
2. Click "Compare & pull request" banner
3. Set base branch to: `dev` (NOT main!)
4. Add a short description
5. Assign one teammate as reviewer
6. Click "Create pull request"
7. Wait for 1 approval before merging

---

## Branch Rules ⚠️
Branch protection rules are already set up on `main` and `dev`.
GitHub will automatically BLOCK you if you try to push directly.

| ✗ Never do this | ✓ Always do this |
|---|---|
| Push directly to `main` | Create a `feature/` branch |
| Push directly to `dev` | PR to `dev` with 1 approval |
| Work on someone else's files | Stick to your assigned feature |

---

## CI / GitHub Actions
A CI pipeline runs automatically on every pull request targeting `main` or `dev`.

It will:
- Install and build the **frontend** (React)
- Install the **backend** (Node.js)

Your PR must pass all CI checks before it can be merged. If CI fails, check the **Actions** tab on GitHub to see the error logs and fix them before requesting a review.

---

## Commit Message Format
Use these prefixes so everyone understands what changed:

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Setup or config |
| `docs:` | Documentation |
| `test:` | Adding tests |

Examples:
```
feat: add login page UI
fix: correct OTP expiry check
chore: update dependencies
docs: update SDD architecture section
```

---

## Feature Assignment

| Member | Feature | Branch |
|---|---|---|
| Member A | Authentication | `feature/auth` |
| Member B | Post Management | `feature/post-management` |
| Member C | Home Feed + Search | `feature/search` |
| Member D | Admin Panel | `feature/admin` |

---

## Project Board (Kanban)
Track everyone's progress here:
https://github.com/Potchara1411/back2you/projects

- Move your card to `🔨 In Progress` when you start
- Move to `👀 In Review` when you open a PR
- Move to `✅ Done` when PR is merged

---

## Key Links
- Repo: https://github.com/Potchara1411/back2you
- Project Board: https://github.com/Potchara1411/back2you/projects
- SRS (Team 3): 
- Figma (Team 3 UI): 

---

## Questions?
Ask in the team KakaoTalk group chat first.
If stuck for more than 30 minutes, ask the team — don't suffer alone!
