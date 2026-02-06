# Foodsy Backend Architecture & CORS Issue Summary

## 🏗️ **Current Architecture**

```
Frontend (Vercel)     →     Backend (AWS EC2)     →     Database (AWS RDS)
foodsy-frontend             apifoodsy-backend           PostgreSQL
.vercel.app                 .com                        

HTTPS requests       →      Nginx (port 443)      →     Spring Boot (port 8080)
                           Reverse Proxy                Docker Container
```

## 🔧 **Infrastructure Components**

### **Frontend (Vercel)**
- **URL:** `https://foodsy-frontend.vercel.app`
- **API Calls:** `https://apifoodsy-backend.com/auth/signup`, `/auth/me`, etc.
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=https://apifoodsy-backend.com`
  - `NEXT_PUBLIC_WS_URL=wss://apifoodsy-backend.com/ws`

### **Backend (AWS EC2 t3.small)**
- **Domain:** `apifoodsy-backend.com` (Route 53 DNS)
- **SSL:** Let's Encrypt certificate (auto-renewal configured)
- **Reverse Proxy:** Nginx → forwards `/auth/signup` to `localhost:8080/api/auth/signup`
- **Application:** Spring Boot in Docker container
- **Endpoints:** All under `/api` prefix (see `springboot-endpoints.md`)

### **Database**
- **Type:** AWS RDS PostgreSQL
- **Connection:** Spring Boot connects via private network
- **Security:** EC2 security group allows access to RDS

## 🚨 **Current CORS Issue**

### **Problem Symptoms:**
- Frontend shows `CORS Missing Allow...` errors
- OPTIONS requests (preflight) failing with 404 status
- Some requests show `localhost:8080` calls (should not happen)

### **Expected vs Actual Flow:**
```
✅ Expected: Frontend → apifoodsy-backend.com → Nginx → Spring Boot
❌ Actual:   Frontend → apifoodsy-backend.com → 404/CORS errors
```

### **CORS Configuration:**
- **Spring Boot:** `CorsConfig.java` allows `https://foodsy-frontend.vercel.app`
- **Environment:** `CORS_ALLOWED_ORIGINS=https://foodsy-frontend.vercel.app`
- **Nginx:** No CORS headers (Spring Boot handles CORS)

## 🔍 **Key Files & Locations**

### **Server Paths (EC2):**
```
/home/ubuntu/foodsy/backend/
├── Dockerfile
├── docker-compose.prod.yml
├── nginx.conf
├── .env.production
└── src/main/java/com/foodsy/config/CorsConfig.java
```

### **Nginx Config:**
- **File:** `/etc/nginx/sites-available/foodsy`
- **Key Setting:** `proxy_pass http://foodsy_backend/api;`
- **Forwards:** `/auth/signup` → `localhost:8080/api/auth/signup`

```
upstream foodsy_backend {  
    server localhost:8080;  
    keepalive 32;  
}

server {  
    server_name apifoodsy-backend.com www.apifoodsy-backend.com;

    add_header Access-Control-Allow-Origin "https://foodsy-frontend.vercel.app" always;  
    add_header Access-Control-Allow-Credentials true always;
   location / {  
        # CRITICAL: Add CORS headers for ALL requests  
        add_header Access-Control-Allow-Origin "https://foodsy-frontend.vercel.app" always;  
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;  
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;  
        add_header Access-Control-Allow-Credentials true always;

       # Handle OPTIONS preflight requests  
        if ($request_method = 'OPTIONS') {  
            add_header Access-Control-Allow-Origin "https://foodsy-frontend.vercel.app";  
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;  
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;  
            add_header Access-Control-Allow-Credentials true always;  
            add_header Content-Length 0;  
            add_header Content-Type text/plain;  
            return 204;  
        }

        proxy_pass http://foodsy_backend/api;  
        proxy_set_header Host $host;  
        proxy_set_header X-Real-IP $remote_addr;  
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
        proxy_set_header X-Forwarded-Proto $scheme;  
        proxy_set_header X-Forwarded-Host $host;  
        proxy_set_header X-Forwarded-Port $server_port;

      # Timeouts


```


### **Spring Boot:**
- **Container:** `foodsy-backend` (Docker)
- **Port:** 8080 (internal only)
- **Base Path:** All endpoints under `/api`

## 🛠️ **Debugging Commands**

### **Test Backend Directly:**
```bash
# Test Spring Boot endpoints
curl http://localhost:8080/api/auth/signup  # Should work
curl http://localhost:8080/api/hello        # Should work

# Test through Nginx
curl https://apifoodsy-backend.com/auth/signup  # Currently failing

# Test CORS preflight
curl -X OPTIONS https://apifoodsy-backend.com/auth/signup \
  -H "Origin: https://foodsy-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" -v
```

### **Check Logs:**
```bash
# Application logs
docker logs foodsy-backend --tail 50

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### **Restart Services:**
```bash
# Rebuild after code changes
docker build -t foodsy-backend .
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Restart Nginx
sudo systemctl restart nginx
```

## 🌐 **Complete CORS & API Workflow**

### **1. The Request Journey**
```
Frontend (Vercel) → Nginx (EC2) → Spring Boot (Docker) → Database (RDS)
     ↓                   ↓              ↓                    ↓
foodsy-frontend    apifoodsy-backend   localhost:8080    RDS endpoint
.vercel.app        .com                (internal)        .amazonaws.com
```

### **2. CORS Preflight Flow (OPTIONS Request)**
When your frontend makes a cross-origin request:

```
1. Browser detects cross-origin request
   └─ Origin: https://foodsy-frontend.vercel.app
   └─ Target: https://apifoodsy-backend.com/auth/signup

2. Browser sends OPTIONS preflight request:
   ┌─ OPTIONS https://apifoodsy-backend.com/auth/signup
   ├─ Origin: https://foodsy-frontend.vercel.app
   ├─ Access-Control-Request-Method: POST
   └─ Access-Control-Request-Headers: content-type

3. Request hits Nginx:
   ┌─ Nginx receives OPTIONS request
   ├─ Forwards to: http://localhost:8080/api/auth/signup
   └─ (No CORS headers added by Nginx)

4. Spring Boot receives OPTIONS:
   ┌─ CorsConfig processes request
   ├─ Checks if origin is allowed
   ├─ Checks if method is allowed
   └─ Returns CORS headers:
      ├─ Access-Control-Allow-Origin: https://foodsy-frontend.vercel.app
      ├─ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
      ├─ Access-Control-Allow-Headers: *
      └─ Access-Control-Allow-Credentials: true

5. Nginx forwards response back to browser
6. Browser receives CORS headers and allows actual request
```

### **3. Environment Configuration Chain**
```
Frontend Environment (Vercel):
├─ NEXT_PUBLIC_API_URL=https://apifoodsy-backend.com
└─ Code calls: ${NEXT_PUBLIC_API_URL}/auth/signup

Backend Environment (.env.production):
├─ CORS_ALLOWED_ORIGINS=https://foodsy-frontend.vercel.app
├─ SPRING_DATASOURCE_URL=jdbc:postgresql://rds-endpoint:5432/db
└─ Used by Spring Boot CorsConfig

Nginx Configuration:
├─ server_name apifoodsy-backend.com
├─ location / { proxy_pass http://foodsy_backend/api; }
└─ Forwards /auth/signup → /api/auth/signup

DNS Configuration:
├─ apifoodsy-backend.com → EC2 public IP
└─ Route 53 A record
```

## 🎯 **Likely Root Causes**

1. **Spring Boot CORS Config:** Not properly handling OPTIONS requests
2. **Nginx Path Mapping:** Possible mismatch in URL forwarding
3. **Frontend Environment:** Vercel env vars not properly updated
4. **Cache Issues:** Browser/CDN caching old responses

## 🔧 **Potential CORS Config Fix**

The current `CorsConfig.java` might need to be updated to explicitly handle preflight requests:

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOrigin("https://foodsy-frontend.vercel.app");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

## 📋 **Next Steps for Developer**

1. **Verify CORS Config:** Check `CorsConfig.java` handles OPTIONS properly
2. **Test Direct Calls:** Ensure `localhost:8080/api/*` endpoints work
3. **Check Nginx Forwarding:** Verify path mapping from `/auth/*` to `/api/auth/*`
4. **Frontend Environment:** Confirm Vercel env vars are correct and deployed
5. **Network Tab Analysis:** Check exact request/response headers in browser

## 🔑 **Critical Settings**

- **Frontend calls:** `https://apifoodsy-backend.com/auth/signup`
- **Nginx forwards to:** `http://localhost:8080/api/auth/signup`
- **Spring Boot expects:** `POST /api/auth/signup`
- **CORS allows:** `https://foodsy-frontend.vercel.app`

## 🚀 **Working Deployment Status**

### **✅ Components Working:**
- SSL certificate (Let's Encrypt)
- DNS resolution (Route 53)
- Nginx reverse proxy
- Spring Boot application
- Database connectivity
- Docker containerization

### **❌ Issue:**
CORS preflight requests failing - Spring Boot not returning proper CORS headers for OPTIONS requests.

## 📞 **Emergency Debugging**

If you need to quickly test if the issue is CORS vs application logic:

**Temporarily disable CORS in browser (for testing only):**
- Chrome: `--disable-web-security --user-data-dir=/tmp/chrome_dev_test`

**This will help isolate whether the issue is CORS configuration or application logic.**

---

**The issue is likely in the CORS preflight handling - Spring Boot isn't returning proper CORS headers for OPTIONS requests.**