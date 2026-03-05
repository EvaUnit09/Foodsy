# AWS EC2 Deployment Todo List

## PHASE 1: LOCAL MACHINE PREPARATION

### [ ] Step 1: Create Production Environment Configuration (LOCAL)
- [ x ] Create `.env.production` file in backend/ directory
- [ x ] Generate secure JWT secret: `openssl rand -base64 32`
- [ x ] Set production database URL (will point to EC2 PostgreSQL)
- [ x ] Configure Google OAuth2 for production domain
- [ x ]  Set CORS origins to include Vercel frontend URL
- [ x ] Document all required environment variables

### [ ] Step 2: Create Dockerfile (LOCAL)
- [ x ] Create `backend/Dockerfile` with multi-stage build:
  ```dockerfile
  FROM openjdk:21-jdk-slim as builder
  WORKDIR /app
  COPY gradle gradle
  COPY gradlew build.gradle.kts settings.gradle.kts ./
  COPY src src
  RUN ./gradlew build -x test
  
  FROM openjdk:21-jre-slim
  WORKDIR /app
  COPY --from=builder /app/build/libs/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]
  ```

### [ ] Step 3: Create Docker Compose for Production (LOCAL)
- [ ] Create `docker-compose.prod.yml` (backend only - using AWS Aurora/RDS):
  ```yaml
  version: '3.8'
  services:
    backend:
      build: .
      ports:
        - "8080:8080"
      env_file:
        - .env.production
      restart: unless-stopped
      networks:
        - app-network
  networks:
    app-network:
      driver: bridge
  ```

### [ ] Step 4: Test Local Docker Build (LOCAL)
- [ x ] Build Docker image: `docker build -t foodsy-backend .`
- [ x ] Test that image builds successfully
- [ x ] Verify JAR file is created correctly
- [ x ] Test with temporary environment variables

### [ ] Step 5: Prepare Deployment Scripts (LOCAL)
- [ ] Create `deploy.sh` script for server deployment
- [ ] Create `nginx.conf` template for reverse proxy
- [ ] Create server setup script `server-setup.sh`
- [ ] Test scripts locally if possible

## PHASE 2: EC2 SERVER INITIAL SETUP

### [ ] Step 6: Connect to EC2 Server (LOCAL → SERVER)
- [ ] SSH into EC2: `ssh -i your-key.pem ubuntu@your-ec2-ip`
- [ ] Verify SSH connection works
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`

### [ ] Step 7: Install Required Software (SERVER)
- [ ] Install Docker:
  ```bash
  sudo apt install docker.io -y
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker ubuntu
  ```
- [ ] Install Docker Compose: `sudo apt install docker-compose -y`
- [ ] Install Nginx: `sudo apt install nginx -y`
- [ ] ~~Install PostgreSQL~~ (Using AWS Aurora/RDS instead)
- [ ] Install Certbot: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] Log out and back in to apply docker group changes

### [ ] Step 8: Configure AWS Aurora/RDS Database (AWS CONSOLE + LOCAL)
- [ ] Get Aurora/RDS connection details from AWS Console:
  - [ ] Database endpoint (e.g., `foodsy-cluster.xyz.us-east-1.rds.amazonaws.com`)
  - [ ] Port (usually 5432 for PostgreSQL)
  - [ ] Database name, username, password
- [ ] Ensure EC2 security group can access RDS security group on port 5432
- [ ] Test connection from your local machine: `psql -h your-rds-endpoint -U username -d database_name`
- [ ] Verify database is accessible and contains required tables (or will be created by JPA)

### [ ] Step 9: Configure Firewall (SERVER)
- [ ] Set up UFW firewall:
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw allow 8080
  sudo ufw enable
  ```
- [ ] Verify EC2 security group allows ports 22, 80, 443

## PHASE 3: APPLICATION DEPLOYMENT

### [ ] Step 10: Transfer Code to Server (LOCAL → SERVER)
- [ ] Create deployment directory: `mkdir -p /home/ubuntu/foodsy-backend`
- [ ] Option A: Use SCP to transfer files:
  ```bash
  scp -i your-key.pem -r backend/ ubuntu@your-ec2-ip:/home/ubuntu/foodsy-backend/
  ```
- [ ] Option B: Clone from GitHub (recommended):
  ```bash
  cd /home/ubuntu
  git clone https://github.com/your-username/foodsy.git
  cd foodsy/backend
  ```

### [ ] Step 11: Set Up Environment Variables (SERVER)
- [ ] Create `.env.production` on server with production values:
  ```bash
  cd /home/ubuntu/foodsy/backend
  nano .env.production
  ```
- [ ] Fill in production values:
  - Database URL: `jdbc:postgresql://your-rds-endpoint:5432/your-db-name`
  - Database credentials from Aurora/RDS setup
  - Your domain name for OAuth2 redirect
  - Vercel frontend URL for CORS
  - Strong JWT secret
- [ ] Secure the file: `chmod 600 .env.production`

### [ ] Step 12: Build and Test Application (SERVER)
- [ ] Build Docker image: `docker build -t foodsy-backend .`
- [ ] Test container: `docker run --env-file .env.production -p 8080:8080 foodsy-backend`
- [ ] In another terminal, test health endpoint: `curl http://localhost:8080/api/actuator/health`
- [ ] Stop test container: `docker stop container_id`

### [ ] Step 13: Deploy with Docker Compose (SERVER)
- [ ] Start services: `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Check containers are running: `docker ps`
- [ ] Check logs: `docker-compose logs -f backend`
- [ ] Test API access: `curl http://localhost:8080/api/actuator/health`

## PHASE 4: REVERSE PROXY AND SSL

### [ ] Step 14: Configure Nginx (SERVER)
- [ ] Create Nginx config: `sudo nano /etc/nginx/sites-available/foodsy`
- [ ] Add configuration:
  ```nginx
  server {
      listen 80;
      server_name your-domain.com;
      
      location / {
          proxy_pass http://localhost:8080;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          
          # WebSocket support
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
      }
  }
  ```
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/foodsy /etc/nginx/sites-enabled/`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`

### [ ] Step 15: Set Up SSL Certificate (SERVER)
- [ ] Get SSL certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`
- [ ] Test HTTPS access: `curl https://your-domain.com/api/actuator/health`

### [ ] Step 16: Update Security Groups (AWS CONSOLE)
- [ ] Remove direct access to port 8080 (only allow from localhost)
- [ ] Ensure ports 80 and 443 are accessible from 0.0.0.0/0
- [ ] Keep SSH (22) access restricted to your IP

## PHASE 5: FRONTEND INTEGRATION

### [ ] Step 17: Update Frontend Configuration (LOCAL)
- [ ] In your Vercel deployment, update environment variables:
  - `NEXT_PUBLIC_API_URL=https://your-domain.com/api`
  - `NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws`
- [ ] Redeploy frontend on Vercel
- [ ] Test API calls from frontend

### [ ] Step 18: Configure DNS (DNS PROVIDER)
- [ ] Get EC2 Elastic IP if not already assigned
- [ ] Point A record to EC2 Elastic IP: `your-domain.com → EC2_ELASTIC_IP`
- [ ] Wait for DNS propagation (up to 24 hours)
- [ ] Test domain resolution: `nslookup your-domain.com`

### [ ] Step 19: Update OAuth2 Settings (GOOGLE CONSOLE)
- [ ] Add production domain to authorized origins
- [ ] Update redirect URI to: `https://your-domain.com/api/login/oauth2/code/google`
- [ ] Update JavaScript origins to include your domain
- [ ] Test OAuth2 flow with production frontend

## PHASE 6: TESTING AND VERIFICATION

### [ ] Step 20: End-to-End Testing (LOCAL/BROWSER)
- [ ] Test user registration and login
- [ ] Test Google OAuth2 authentication
- [ ] Test session creation and joining
- [ ] Test WebSocket real-time features
- [ ] Test voting functionality
- [ ] Test restaurant search (Google Places API)
- [ ] Verify CORS is working correctly

### [ ] Step 21: Performance and Monitoring Setup (SERVER)
- [ ] Set up log rotation for application logs
- [ ] Configure JVM heap settings in docker-compose.yml:
  ```yaml
  environment:
    - "JAVA_OPTS=-Xmx1g -Xms512m"
  ```
- [ ] Set up basic monitoring:
  ```bash
  # Create monitoring script
  nano ~/monitor.sh
  # Add health checks and alerts
  ```
- [ ] Schedule regular database backups

## PHASE 7: PRODUCTION HARDENING

### [ ] Step 22: Security Hardening (SERVER)
- [ ] Install fail2ban: `sudo apt install fail2ban -y`
- [ ] Configure automatic security updates
- [ ] Set up proper file permissions
- [ ] Review and harden SSH configuration
- [ ] Set up log monitoring

### [ ] Step 23: Backup Setup (AWS CONSOLE)
- [ ] Configure automated backups for Aurora/RDS:
  - [ ] Set backup retention period (7-35 days recommended)
  - [ ] Configure backup window during low-traffic hours
  - [ ] Enable point-in-time recovery
- [ ] Optional: Create manual backup script for additional backups:
  ```bash
  #!/bin/bash
  pg_dump -h your-rds-endpoint -U username database_name > /home/ubuntu/backups/foodsy_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Test backup restoration process using AWS Console

## EXECUTION ORDER SUMMARY

1. **LOCAL (Steps 1-5)**: Prepare Docker files, environment configs, deployment scripts
2. **SERVER (Steps 6-9)**: Initial server setup, install software, configure database
3. **LOCAL→SERVER (Steps 10-13)**: Transfer code and deploy application
4. **SERVER (Steps 14-16)**: Set up reverse proxy and SSL
5. **LOCAL + DNS (Steps 17-19)**: Update frontend, configure DNS, update OAuth2
6. **TESTING (Steps 20-21)**: Verify everything works end-to-end
7. **SERVER (Steps 22-23)**: Production hardening and backup setup

## Environment Variables Checklist

Create `.env.production` with:
```
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://your-rds-endpoint:5432/your-db-name
SPRING_DATASOURCE_USERNAME=your_rds_username
SPRING_DATASOURCE_PASSWORD=your_rds_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_PLACES_API_KEY=your_places_api_key
JWT_SECRET=your_256_bit_secure_secret
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
OAUTH2_REDIRECT_URI=https://your-domain.com/api/login/oauth2/code/google
LOG_LEVEL_ROOT=INFO
SHOW_SQL=false
```

## Quick Reference Commands

### Local Commands:
```bash
# Build Docker image
docker build -t foodsy-backend .

# Transfer files to server
scp -i key.pem -r backend/ ubuntu@server-ip:/home/ubuntu/
```

### Server Commands:
```bash
# Deploy application
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f backend

# Test health
curl http://localhost:8080/api/actuator/health

# SSL certificate
sudo certbot --nginx -d your-domain.com
```
