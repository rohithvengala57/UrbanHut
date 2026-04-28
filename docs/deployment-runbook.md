# Urban Hut — Production Deployment Runbook

## Overview

This runbook covers the final go-live deployment of the Urban Hut backend (FastAPI) and mobile app (Expo React Native). Follow every step in order. Do not skip the verification steps.

## Prerequisites

| Item | Where to get it |
|------|----------------|
| AWS account with ECR, EC2, RDS, ElastiCache, S3 | AWS Console |
| EC2 instance (t3.medium minimum, Amazon Linux 2023) | AWS Console |
| RDS PostgreSQL 16 with PostGIS extension | AWS RDS |
| ElastiCache Redis 7 | AWS ElastiCache |
| GitHub repository secrets configured | GitHub → Settings → Secrets |
| Domain + SSL certificate | Route 53 + ACM |
| Resend account + verified sending domain | resend.com |
| Google Maps API key (Geocoding + Maps SDK) | Google Cloud Console |
| Expo account for OTA updates | expo.dev |

## Step 1 — Configure GitHub Secrets

Add the following secrets to the repository under **Settings → Secrets and Variables → Actions**:

```
AWS_ACCESS_KEY_ID          IAM key for ECR push + EC2 deploy
AWS_SECRET_ACCESS_KEY      IAM secret
EC2_HOST                   Public IP or hostname of the EC2 instance
EC2_SSH_KEY                Private SSH key (PEM) for ec2-user
PRODUCTION_DOMAIN          e.g. api.urbanhut.com
DATABASE_URL               postgresql+asyncpg://user:pass@rds-host:5432/urbanhut
REDIS_URL                  redis://elasticache-host:6379/0
JWT_SECRET_KEY             Random 64-byte hex (openssl rand -hex 64)
AWS_S3_BUCKET              urbanhut-uploads-prod
RESEND_API_KEY             re_...
GOOGLE_MAPS_API_KEY        AIza...
GOOGLE_OAUTH_CLIENT_ID     ...apps.googleusercontent.com
APPLE_SIGN_IN_KEY          -----BEGIN PRIVATE KEY-----...
```

## Step 2 — Provision EC2 Instance

SSH into the instance and run:

```bash
# Install Docker + Compose
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install

# Create app directory
sudo mkdir -p /opt/urbanhut
sudo chown ec2-user:ec2-user /opt/urbanhut

# Copy docker-compose.prod.yml from repo
cp docker-compose.prod.yml /opt/urbanhut/docker-compose.prod.yml

# Copy the production .env (populate from .env.production.example)
cp .env.production /opt/urbanhut/.env
```

## Step 3 — Enable PostGIS on RDS

Connect to the RDS instance and run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

## Step 4 — Run Database Migrations

Migrations run automatically as part of the CI/CD pipeline (`migrate` job). To run them manually:

```bash
cd backend
source venv/bin/activate
DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head
alembic current  # Confirm head is applied
```

## Step 5 — First Deploy

Push to `main` to trigger the GitHub Actions pipeline:

```
test → build-and-push → migrate → deploy
```

Monitor the Actions run in GitHub. All four jobs must succeed before proceeding to verification.

## Step 6 — Verification Checklist

Run these checks against `https://<PRODUCTION_DOMAIN>` immediately after deploy:

### Health endpoint
```bash
curl https://api.urbanhut.com/health
# Expected: {"status": "healthy", "version": "0.1.0"}
```

### API status
```bash
curl https://api.urbanhut.com/api/status
# Expected: {"min_version":"1.0.0", "maintenance_mode":false, "status":"operational"}
```

### Core flow — Signup
```bash
curl -X POST https://api.urbanhut.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-test@urbanhut.com","password":"TestPass123!","full_name":"Smoke Test"}'
# Expected: 201, returns user object with id
```

### Core flow — Login
```bash
curl -X POST https://api.urbanhut.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-test@urbanhut.com","password":"TestPass123!"}'
# Expected: 200, returns access_token and refresh_token
```

### Core flow — Listing Create (replace TOKEN with access_token above)
```bash
curl -X POST https://api.urbanhut.com/api/v1/listings/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Smoke Test Listing",
    "description": "A smoke test listing for go-live verification purposes",
    "address": "123 Main St, San Francisco, CA 94102",
    "rent_monthly": 1500,
    "total_bedrooms": 2,
    "total_bathrooms": 1,
    "available_spots": 1,
    "current_occupants": 1,
    "available_from": "2026-05-01"
  }'
# Expected: 201, listing has latitude/longitude populated (geocoding working)
```

If all three smoke-test flows pass, delete the smoke-test account.

## Step 7 — Mobile App Release

After the backend is verified:

```bash
cd mobile
npm install

# Build production EAS bundle
npx eas build --platform all --profile production

# Submit to stores (after EAS build completes)
npx eas submit --platform ios
npx eas submit --platform android
```

Update `app.json` with the correct `API_URL` pointing to the production domain before building.

## Step 8 — Infrastructure Monitoring

### Uptime monitoring
Set up a check on `https://api.urbanhut.com/health` in your uptime tool (UptimeRobot, Better Uptime, etc.):
- Check interval: 60 seconds
- Alert channel: Slack or email
- Alert after: 2 consecutive failures

### CloudWatch alarms (recommended)
```bash
# EC2 CPU > 80% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name urbanhut-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>

# RDS connections > 80% of max
aws cloudwatch put-metric-alarm \
  --alarm-name urbanhut-rds-connections \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>
```

## Rollback Procedure

If the health check fails after deploy:

```bash
# SSH into EC2
cd /opt/urbanhut

# List recent images
docker images urbanhut-backend

# Roll back to previous image tag
export IMAGE_TAG=<previous-sha>
docker compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost:8000/health
```

For database rollback:
```bash
cd backend
DATABASE_URL="..." alembic downgrade -1
```

## Post-Launch Monitoring (First 48h)

- Watch structured JSON logs: `docker logs urbanhut-backend-backend-1 -f`
- Key log events to watch: `request_unhandled_exception`, `auth_or_permission_error`, `http_server_error`
- Check `/api/v1/telemetry` endpoint for client error rates
- Monitor RDS CPU and connection count in CloudWatch
