# Peblo Notes Workspace

A full-stack notes workspace built for the Peblo Full Stack Developer Challenge using React, Express, Node.js, and PostgreSQL.

## Tech Stack

- Frontend: React 19 + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT in an HTTP-only cookie + bcrypt password hashing
- AI: Configurable LLM endpoint with a local development fallback

## Features

- Signup, login, logout, and protected app routes
- Full CRUD for notes and meetings
- Autosave editing for title, content, tags, category, type, and meeting time
- Archive/restore and permanent delete
- Search, tag filtering, and recently updated sorting
- AI summary, action items, and suggested title
- Public share links for unauthenticated viewing
- Productivity insights: total notes, total meetings, top tags, recent edits, AI usage, weekly activity

## Demo Video

[Watch the 5-10 minute walkthrough](https://drive.google.com/file/d/1-CeNHIbRzD5piirW1gsEtCuDxujkR0wN/view?usp=sharing)

## Included In This Submission

- GitHub repository with frontend and backend source code
- Setup instructions in this README
- `.env.example` with required environment variables
- PostgreSQL schema in `database/schema.sql`
- Sample API responses and schema notes in `samples/`
- Application screenshots in `screenshots/`
- Demo video linked above

## Folder Structure

```text
peblonotes-react-express/
  client/       React + Vite frontend
  server/       Express API
  database/     PostgreSQL schema
  samples/      Sample API outputs and schema notes
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Run database migration:

```bash
npm run db:migrate
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start frontend and backend together:

```bash
npm run dev
```

Open:

- React app: [http://localhost:5173](http://localhost:5173)
- Express API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

Demo account after seeding:

- Email: `demo@peblo.test`
- Password: `password123`

## Environment Variables

```bash
DATABASE_URL=postgres://peblo:peblo_password@localhost:5432/peblonotes
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_NAME=peblo_session
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
LLM_API_KEY=
LLM_API_URL=
LLM_MODEL=
```

Never commit real secrets.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create user and session |
| `POST` | `/api/auth/login` | Start session |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/notes` | Read notes/meetings with search and filters |
| `POST` | `/api/notes` | Create note or meeting |
| `PATCH` | `/api/notes/:id` | Update note or meeting |
| `DELETE` | `/api/notes/:id` | Permanently delete note or meeting |
| `POST` | `/api/notes/:id/generate-summary` | Generate AI output |
| `POST` | `/api/notes/:id/share` | Toggle public sharing |
| `GET` | `/api/shared/:shareId` | Public shared note data |
| `GET` | `/api/insights` | Productivity dashboard |

## Tests and Build

```bash
npm run test
npm run build
```

The test suite covers the AI service fallback, and the production build verifies the React app compiles successfully.

## Screenshots

### Login / Signup
![Login and signup screen](screenshots/login.png)

### Empty Workspace
![Empty workspace](screenshots/workspace-empty.png)

### Meeting Workspace
![Meeting workspace](screenshots/workspace-meeting.png)

### AI Output
![AI output](screenshots/ai-output.png)

### Dashboard And Public Share
![Dashboard and public share link](screenshots/dashboard-share.png)

### Public Shared Note
![Public shared note](screenshots/public-share.png)

## Demo Video Checklist

Show these flows in the required walkthrough:

1. Signup/login.
2. Create a note and a meeting.
3. Edit/update fields and autosave.
4. Search and tag filtering.
5. AI summary/action items/title suggestion.
6. Public share page.
7. Dashboard insights.
8. Archive/restore/delete.
