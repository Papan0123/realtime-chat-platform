# AWS EC2 Deployment

This deployment runs:

- NestJS API on port `3000`
- Expo web frontend on port `8081`
- PostgreSQL and Redis inside Docker

## 1. EC2 Instance

Recommended beginner setup:

- Ubuntu Server 24.04 LTS
- Instance type: `t3.micro` or `t2.micro`
- Storage: 20 GB

Security group inbound rules:

```text
22    TCP    Your IP only
3000  TCP    0.0.0.0/0
8081  TCP    0.0.0.0/0
```

## 2. Install Docker On EC2

SSH into the instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Install Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and SSH back in so the Docker group applies.

## 3. Clone And Configure

```bash
git clone https://github.com/Papan0123/realtime-chat-platform.git
cd realtime-chat-platform
cp .env.production.example .env.production
nano .env.production
```

Set:

```text
POSTGRES_PASSWORD=strong-password
JWT_SECRET=long-random-secret
CORS_ORIGIN=http://your-ec2-public-ip:8081,http://your-ec2-public-ip
```

## 4. Start The App

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

Check logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Open:

```text
Frontend: http://your-ec2-public-ip:8081
Swagger:  http://your-ec2-public-ip:3000/docs
```

In the frontend API endpoint field, use:

```text
http://your-ec2-public-ip:3000
```
