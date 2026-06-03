# Realtime Chat Platform

Production-style realtime chat project with a NestJS backend and an Expo React Native frontend.

## Features

- JWT authentication
- Password hashing with bcrypt
- PostgreSQL persistence
- Private chat rooms
- Realtime messaging with Socket.IO
- Typing indicators
- Read status updates
- Online/offline presence
- Redis Pub/Sub foundation
- Docker Compose for API, PostgreSQL, and Redis
- Expo mobile/web frontend

## Project Structure

```text
chat-backend/  NestJS API, Socket.IO gateway, PostgreSQL, Redis, Docker
chat-mobile/   Expo React Native chat client
```

## Run Backend

```bash
cd chat-backend
docker-compose up --build
```

Swagger:

```text
http://localhost:3000/docs
```

## Run Frontend

```bash
cd chat-mobile
npm install
npm run web
```

Frontend:

```text
http://localhost:8081
```

For phone testing, use your laptop Wi-Fi IP inside the app API endpoint, for example:

```text
http://192.168.1.8:3000
```

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for AWS EC2 deployment steps.
