# Flux — Real-time Chat Application

High-performance, scalable chat application built with Next.js, Node.js, PostgreSQL, Redis, and Socket.IO.

---

## Architecture

```
Client (Next.js 14)
  │
  ├── REST  → Express API  → PostgreSQL (Prisma)
  └── WSS   → Socket.IO    → Redis (presence, typing, pub-sub)
                                     ↕
                              S3/MinIO (media)
```

### Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | Next.js 14, React, Zustand, TailwindCSS |
| Backend     | Node.js 20, Express, TypeScript         |
| Real-time   | Socket.IO 4 + Redis adapter             |
| Database    | PostgreSQL 15 + Prisma ORM              |
| Cache       | Redis 7                                 |
| Storage     | MinIO (local) / AWS S3 (prod)           |
| Proxy       | Nginx                                   |
| Container   | Docker + Docker Compose                 |

---

## Local Setup (5 minutes)

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### 1. Clone and configure

```bash
git clone <repo>
cd flux

# Backend env
cp backend/.env.example backend/.env

# Edit backend/.env and set:
# JWT_ACCESS_SECRET  (run: openssl rand -hex 64)
# JWT_REFRESH_SECRET (run: openssl rand -hex 64)
# COOKIE_SECRET      (run: openssl rand -hex 32)

# Frontend env
cp frontend/.env.example frontend/.env.local
```

### 2. Start infrastructure

```bash
# Start Postgres, Redis, MinIO
docker compose up postgres redis minio minio-setup -d

# Wait for health checks to pass (~15 seconds)
docker compose ps
```

### 3. Run backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
# API running on http://localhost:4000
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:3000
```

### 5. Open app

Navigate to `http://localhost:3000` — register two accounts in separate browser tabs and start chatting.

---

## Full Docker Stack (one command)

```bash
# Set required secrets
export JWT_ACCESS_SECRET=$(openssl rand -hex 64)
export JWT_REFRESH_SECRET=$(openssl rand -hex 64)
export COOKIE_SECRET=$(openssl rand -hex 32)

docker compose up --build
```

App: `http://localhost:3000`
API: `http://localhost:4000`
MinIO Console: `http://localhost:9001` (minioadmin / minioadmin)

---

## API Reference

### Auth
```
POST /api/auth/register   { email, username, displayName, password }
POST /api/auth/login      { email, password }
POST /api/auth/refresh    (uses httpOnly refresh_token cookie)
POST /api/auth/logout
GET  /api/auth/me
```

### Users
```
GET  /api/users/search?q=:query
GET  /api/users/:userId
PATCH /api/users/me       { displayName?, bio?, avatarUrl? }
POST /api/users/presence  { userIds: string[] }
```

### Chats
```
GET  /api/chats
POST /api/chats/direct    { targetUserId }
POST /api/chats/group     { name, memberIds, description? }
GET  /api/chats/:chatId
PATCH /api/chats/:chatId  { name?, description? }
POST /api/chats/:chatId/members          { userIds }
DELETE /api/chats/:chatId/members/:userId
```

### Messages
```
GET  /api/chats/:chatId/messages?cursor=:iso&limit=40
POST /api/chats/:chatId/messages  { content?, type?, replyToId?, mediaIds? }
PATCH /api/chats/:chatId/messages/:messageId { content }
DELETE /api/chats/:chatId/messages/:messageId
POST /api/chats/:chatId/messages/read { messageIds }
```

### Media
```
POST /api/media/presign   { filename, mimeType, size }
GET  /api/media/:mediaId/download
```

---

## Socket.IO Events

### Client → Server
```
message:send      { chatId, content, type?, replyToId?, tempId? }
message:edit      { messageId, content }
message:delete    { messageId }
message:read      { chatId, messageIds }
typing:start      { chatId }
typing:stop       { chatId }
presence:heartbeat
```

### Server → Client
```
message:new       Message
message:updated   Message
message:deleted   { messageId, chatId }
message:delivered { messageId, userId }
message:read      { messageIds, chatId, userId }
typing:start      { chatId, userId, displayName }
typing:stop       { chatId, userId }
presence:update   { userId, isOnline, lastSeen? }
notification:new  Notification
```

---

## Production Deployment

### Generate self-signed cert (for Nginx)
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Start with Nginx
```bash
docker compose --profile production up -d
```

### Cloud recommendations
- **Database**: AWS RDS PostgreSQL / Supabase
- **Redis**: AWS ElastiCache / Upstash
- **Storage**: AWS S3
- **Backend**: AWS ECS / Railway / Render
- **Frontend**: Vercel (zero config Next.js deployment)
- **CDN**: CloudFront in front of Nginx for assets

### Scaling
- Socket.IO uses Redis adapter — run multiple backend instances safely
- Stateless JWT auth — no sticky sessions needed
- PostgreSQL read replicas for message history queries
- Redis cluster for presence at scale

---

## Security Notes

- Passwords: bcrypt with 12 rounds
- Tokens: httpOnly cookies prevent XSS, short-lived access tokens (15m)
- Refresh token rotation: single-use with family revocation on reuse
- Rate limiting: 300 req/15min general, 20 req/15min auth
- All uploads: presigned URLs — server never proxies binary data
- Helmet + CORS configured for production origins only

---

## Project Structure

```
flux/
├── backend/
│   ├── prisma/schema.prisma       # DB schema
│   └── src/
│       ├── config/                # env, db, redis
│       ├── controllers/           # request handlers
│       ├── middleware/            # auth, error, validate
│       ├── routes/                # API routes
│       ├── services/              # business logic
│       ├── socket/                # Socket.IO server + events
│       └── utils/                 # jwt, logger, response
├── frontend/
│   └── src/
│       ├── app/                   # Next.js App Router
│       ├── components/
│       │   ├── auth/              # login/register forms
│       │   └── chat/              # chat UI components
│       ├── hooks/                 # useSocket, useMessages
│       ├── lib/                   # axios client, socket client
│       ├── store/                 # Zustand stores
│       └── types/                 # TypeScript types
├── nginx/nginx.conf
└── docker-compose.yml
```
