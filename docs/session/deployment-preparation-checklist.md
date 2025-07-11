# Deployment Preparation Checklist

## Overview
Preparing to deploy Foodsy backend on AWS EC2 and frontend on Vercel.

**Current Architecture:**
- Backend: Spring Boot app with PostgreSQL, JWT auth, WebSockets
- Frontend: Next.js app with OAuth2 and real-time features
- External APIs: Google Places API, Google OAuth2

---

## Backend Deployment (AWS EC2)

### 1. Environment Variables Setup ✅
**Critical environment variables needed:**
```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://YOUR_RDS_ENDPOINT:5432/foodsy
SPRING_DATASOURCE_USERNAME=your_db_user
SPRING_DATASOURCE_PASSWORD=your_db_password

# Google APIs  
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_PLACES_API_KEY=your_places_api_key

# JWT Security
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_chars
JWT_EXPIRATION_HOURS=24
JWT_REFRESH_EXPIRATION_HOURS=168

# CORS
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://custom-domain.com

# Server
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod
```

### 2. Database Setup (AWS RDS) ✅
- [ ] Create PostgreSQL instance on AWS RDS
- [ ] Configure security groups (allow EC2 access)
- [ ] Create database: `foodsy`
- [ ] Update connection URL in env vars
- [ ] Test connection from local environment first

### 3. Security Configuration ✅
**Issues to fix:**
- [ ] Remove hardcoded database credentials from `application.properties`
- [ ] Set up production-grade JWT secret
- [ ] Update OAuth2 redirect URIs to production backend URL
- [ ] Configure proper CORS origins for Vercel app

### 4. Build Configuration ✅
- [ ] Update `application.properties` for production profile
- [ ] Build JAR: `./gradlew build -x test`
- [ ] Test JAR locally: `java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`

### 5. EC2 Instance Setup ✅
**Requirements:**
- [ ] Java 21 runtime
- [ ] Security groups: HTTP(80), HTTPS(443), SSH(22), Custom(8080)
- [ ] Create log directory: `/var/log/foodsy/`
- [ ] Install systemd service for auto-restart

**Sample systemd service (`/etc/systemd/system/foodsy.service`):**
```ini
[Unit]
Description=Foodsy Backend
After=network.target

[Service]
Type=simple
User=ec2-user
ExecStart=/usr/bin/java -jar /home/ec2-user/foodsy/backend.jar
EnvironmentFile=/home/ec2-user/foodsy/.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 6. SSL Certificate ✅
- [ ] Option A: Use AWS Application Load Balancer with ACM
- [ ] Option B: Let's Encrypt with certbot
- [ ] Update Google OAuth console with HTTPS URLs

---

## Frontend Deployment (Vercel)

### 1. Environment Variables ✅
**Required Vercel environment variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-ec2-domain.com:8080
```

### 2. Code Updates Required ✅
**Critical fixes needed:**

#### Update hardcoded API URLs:
- [ ] `frontend/src/api/homepageApi.ts` line 2
- [ ] `frontend/src/app/sessions/[id]/page.tsx` line 24  
- [ ] `frontend/src/app/auth/signin/page.tsx` line 25
- [ ] `frontend/src/contexts/AuthContext.tsx` line 49
- [ ] `frontend/src/hooks/useSessionVoting.ts` line 33
- [ ] `frontend/src/app/sessions/create/page.tsx` line 42
- [ ] `frontend/src/hooks/useWebSockethook.tsx` line 12
- [ ] `frontend/src/components/WebSocket*.tsx` files

#### Update Next.js config:
- [ ] `frontend/next.config.ts` - update API rewrite destination

### 3. Build Configuration ✅
- [ ] Test build locally: `npm run build`
- [ ] Verify environment variables work in build
- [ ] Test production build: `npm run start`

---

## Google Services Configuration

### 1. Google OAuth Console ✅
**Update authorized URLs:**
```bash
# Authorized redirect URIs
https://your-ec2-domain.com:8080/login/oauth2/code/google

# Authorized JavaScript origins  
https://your-vercel-app.vercel.app
https://custom-domain.com (if applicable)
```

### 2. Google Places API ✅
- [ ] Verify API key has proper restrictions
- [ ] Add EC2 server IP to allowed referrers if needed
- [ ] Monitor quota usage

---

## Configuration Files Needing Updates

### Backend Files:
1. **`application.properties`** - Remove hardcoded values, use env vars
2. **`CorsConfig.java`** - Add production frontend URL 
3. **`SecurityConfig.java`** - Update CORS origins
4. **`WebSocketConfig.java`** - Add production origin

### Frontend Files:
1. **All API calls** - Use `NEXT_PUBLIC_API_URL` instead of hardcoded localhost
2. **`next.config.ts`** - Update rewrite destination
3. **WebSocket connections** - Use production backend URL

---

## Testing Strategy

### Pre-deployment Tests ✅
- [ ] Local build test with production env vars
- [ ] Database connectivity test
- [ ] API endpoints test with production CORS
- [ ] JWT token generation/validation test

### Post-deployment Tests ✅
- [ ] Backend health check: `GET /api/actuator/health`
- [ ] Frontend loads correctly
- [ ] Authentication flow (sign up/sign in)
- [ ] Session creation and joining
- [ ] WebSocket connectivity
- [ ] Restaurant search functionality
- [ ] Voting functionality

---

## Monitoring & Maintenance

### Backend Monitoring ✅
- [ ] Set up CloudWatch logs
- [ ] Configure health check endpoint
- [ ] Monitor database connections
- [ ] Track API usage (Google Places quotas)

### Frontend Monitoring ✅
- [ ] Vercel analytics
- [ ] Error tracking (Sentry/similar)
- [ ] Performance monitoring

---

## Security Checklist

### Production Security ✅
- [ ] Environment variables properly secured
- [ ] Database credentials not in code
- [ ] JWT secrets are strong and unique
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Security groups restrict access appropriately
- [ ] Log files don't contain sensitive data

---

## Deployment Commands Reference

### Backend Deployment:
```bash
# Build
./gradlew build -x test

# Copy to EC2
scp build/libs/backend-0.0.1-SNAPSHOT.jar ec2-user@your-ec2-ip:/home/ec2-user/

# On EC2
sudo systemctl enable foodsy
sudo systemctl start foodsy
sudo systemctl status foodsy
```

### Frontend Deployment:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Rollback Plan ✅
- [ ] Keep previous JAR version on EC2
- [ ] Document systemctl restart procedure  
- [ ] Vercel deployment history for quick rollback
- [ ] Database backup before schema changes

---

**Status**: Ready for deployment pending completion of checklist items
**Next Steps**: Start with environment variable setup and database configuration 