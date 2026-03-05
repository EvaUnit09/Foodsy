# Vercel API Routes Setup

This project uses Vercel API routes to proxy requests to the AWS backend, enabling same-domain authentication.

## 🚀 **Deployment Steps:**

### 1. **Environment Variables**
In your Vercel dashboard, add these environment variables:
```
BACKEND_URL=https://apifoodsy-backend.com
```

### 2. **API Routes Created**
The following API routes have been created to proxy to your AWS backend:
- `/api/auth/[...path]` → `/auth/*` endpoints
- `/api/sessions/[...path]` → `/sessions/*` endpoints  
- `/api/votes/[...path]` → `/votes/*` endpoints
- `/api/restaurants/[...path]` → `/restaurants/*` endpoints
- `/api/homepage/[...path]` → `/homepage/*` endpoints

### 3. **Frontend API Client**
The API client has been updated to use `/api` as the base URL, which will route through Vercel's API routes.

### 4. **Authentication Flow**
- OAuth2 redirects to `https://foodsy-frontend.vercel.app/auth/oauth2/success`
- Refresh tokens stored as HttpOnly cookies
- Access tokens passed via URL parameters and stored in localStorage
- All API calls go through same-domain proxy

## 🔧 **Benefits:**
- ✅ **Same-domain requests** - No CORS issues
- ✅ **Secure cookies** - HttpOnly refresh tokens
- ✅ **Simplified authentication** - No cross-domain token handling
- ✅ **Better security** - All requests go through your domain

## 📋 **Next Steps:**
1. Deploy to Vercel
2. Configure environment variables
3. Test OAuth2 flow
4. Monitor API proxy logs in Vercel dashboard 