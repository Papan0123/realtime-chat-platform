# Realtime Chat Backend

This is the backend foundation for a production-style realtime chat app.

## What is included

- NestJS API
- JWT authentication with bcrypt password hashing
- PostgreSQL persistence with TypeORM
- Users, private rooms, group rooms, room members, and messages
- Socket.IO gateway for realtime events
- Typing indicators, read receipts, and presence events
- Redis Pub/Sub hook for multi-instance scaling
- Dockerfile and Docker Compose
- Nginx reverse proxy example
- GitHub Actions CI starter
- Swagger API docs at `/docs`

## Run with Docker

```bash
docker-compose up --build
```

API:

```text
http://localhost:3000
```

Swagger docs:

```text
http://localhost:3000/docs
```

## Run locally

Copy the env example first:

```bash
cp .env.example .env
```

Start PostgreSQL and Redis, then run:

```bash
npm install
npm run start:dev
```

## Main REST APIs

```text
POST /auth/register
POST /auth/login
GET /profile
GET /users/lookup?email=user@example.com
GET /rooms
GET /rooms/:id
POST /rooms/private
POST /group/create
POST /group/add-member
POST /group/remove-member
GET /rooms/:roomId/messages
POST /rooms/:roomId/messages
```

Use the login/register `accessToken` as:

```text
Authorization: Bearer <token>
```

## Socket.IO events

Connect with the JWT:

```js
io('http://localhost:3000', {
  auth: { token: accessToken },
});
```

Client emits:

```text
join_room
leave_room
join_group
send_message
message_read
typing_start
typing_stop
```

Client listens:

```text
receive_message
message_status_updated
presence_changed
typing_start
typing_stop
joined_room
left_room
```

## Suggested next phase

Build the React Native + Expo client with screens for:

- Register/login
- Chat list
- Private chat
- Group chat
- Typing indicator
- Online/last seen
- Read receipts
