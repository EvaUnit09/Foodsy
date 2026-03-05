# Foodsy Debugging & Testing Gameplan

## **Current Issue Summary**

**Primary Problem**: OAuth2 authentication flow fails at the `/api/auth/me` endpoint
- Frontend calls `/api/auth/me` and receives 404/500 errors
- Backend logs show successful authentication and user data retrieval
- Disconnect between backend success and frontend failure

**Root Cause Hypothesis**: Vercel API route is not properly forwarding backend responses to frontend

---

## **Phase 1: Immediate Verification Tests**

### **Test 1: Backend Direct Validation**
**Purpose**: Confirm backend is working independently
```bash
# Test OAuth2 endpoint
curl -I https://apifoodsy-backend.com/oauth2/authorization/google

# Test auth endpoints without tokens (should return 401)
curl -X POST https://apifoodsy-backend.com/auth/refresh
curl -X GET https://apifoodsy-backend.com/auth/me

# Test with valid access token (after OAuth2 flow)
curl -X GET https://apifoodsy-backend.com/auth/me \
  -H "Authorization: Bearer {access_token_from_oauth2}"
```

**Expected Results**:
- OAuth2: 302 redirect to Google
- Auth endpoints without tokens: 401 Unauthorized
- Auth endpoints with valid tokens: 200 OK with user data

### **Test 2: Vercel API Route Validation**
**Purpose**: Confirm Vercel proxy is working
```bash
# Test simple endpoints
curl https://foodsy-frontend.vercel.app/api/test-backend

# Test auth proxy (should match backend behavior)
curl -X POST https://foodsy-frontend.vercel.app/api/auth/refresh
curl -X GET https://foodsy-frontend.vercel.app/api/auth/me
```

**Expected Results**:
- Test backend: 200 OK with connection info
- Auth endpoints: Same responses as direct backend calls

### **Test 3: Frontend Integration Test**
**Purpose**: Test complete OAuth2 flow in browser
1. Open incognito window
2. Navigate to `https://foodsy-frontend.vercel.app`
3. Click "Sign In with Google"
4. Complete OAuth2 flow
5. Monitor browser console and network tab

**Expected Results**:
- Successful OAuth2 redirect
- Access token stored in localStorage
- `/api/auth/me` returns user data (not 404/500)

---

## **Phase 2: Systematic Debugging**

### **Debug Step 1: Enable Verbose Logging**

**Backend Logging Enhancement** (`application.yml`):
```yaml
logging:
  level:
    com.foodsy: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
```

**Frontend Logging Enhancement** (Vercel API routes):
- Already enhanced with detailed console.log statements
- Monitor Vercel function logs via dashboard

### **Debug Step 2: Token Flow Analysis**

**Test OAuth2 Token Generation**:
1. Complete OAuth2 flow manually
2. Capture access token from URL parameters
3. Test token directly against backend endpoints
4. Verify token format and claims

**JWT Token Inspection**:
```bash
# Decode JWT token (without verification)
echo "{jwt_token}" | cut -d. -f2 | base64 -d | jq .
```

**Expected JWT Claims**:
```json
{
  "sub": "user_username",
  "email": "user@email.com", 
  "type": "access",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### **Debug Step 3: Request/Response Analysis**

**Backend Request Logging** (add to `AuthController`):
```java
@GetMapping("/me")
public ResponseEntity<UserDto> getCurrentUser(Principal principal, HttpServletRequest request) {
    System.out.println("=== REQUEST ANALYSIS ===");
    System.out.println("Principal: " + principal);
    System.out.println("Request URI: " + request.getRequestURI());
    System.out.println("Request Headers:");
    request.getHeaderNames().asIterator().forEachRemaining(
        header -> System.out.println("  " + header + ": " + request.getHeader(header))
    );
    // ... existing logic
}
```

**Vercel API Route Response Logging** (enhance existing):
```typescript
// In frontend/src/pages/api/auth/[...path].ts
console.log(`=== RESPONSE ANALYSIS ===`);
console.log(`Response Status: ${response.status}`);
console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
console.log(`Response OK: ${response.ok}`);

// Test response body parsing
const responseText = await response.text();
console.log(`Raw Response Body:`, responseText);

try {
  const data = JSON.parse(responseText);
  console.log(`Parsed Response:`, data);
} catch (e) {
  console.log(`Failed to parse JSON:`, e);
}
```

---

## **Phase 3: Component Isolation Testing**

### **Test 1: JWT Authentication Filter**

**Bypass Filter Test**:
- Temporarily modify `shouldSkipAuthentication()` to include `/auth/**`
- Test if `/auth/me` works without JWT validation
- **Purpose**: Isolate JWT filter vs controller issues

### **Test 2: UserDto Serialization**

**Direct Serialization Test**:
```java
// Add test endpoint to AuthController
@GetMapping("/test-userdto")
public ResponseEntity<UserDto> testUserDto() {
    // Create sample UserDto
    UserDto testUser = new UserDto(
        1L, "testuser", "test@example.com", 
        "Test", "User", "Test User",
        "http://avatar.url", AuthProvider.GOOGLE,
        true, LocalDateTime.now()
    );
    return ResponseEntity.ok(testUser);
}
```

**Expected Result**: Verify JSON serialization works correctly

### **Test 3: Database Connection**

**User Lookup Test**:
```bash
# Connect to production database
psql -h {rds_endpoint} -U {username} -d {database}

# Verify user exists and data matches expectations
SELECT id, username, email, display_name, provider, created_at 
FROM users 
WHERE username = '{oauth2_username}';
```

---

## **Phase 4: Edge Case Testing**

### **Test 1: Token Timing Issues**
- Test immediate `/auth/me` call after OAuth2 (timing race condition)
- Add deliberate delays between token generation and usage
- Test token refresh scenarios

### **Test 2: CORS Preflight**
```bash
# Test OPTIONS preflight for auth endpoints
curl -X OPTIONS https://apifoodsy-backend.com/auth/me \
  -H "Origin: https://foodsy-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```

### **Test 3: Cookie vs Header Authentication**
- Test with Authorization header only
- Test with cookies only  
- Test with both present
- Test with malformed tokens

---

## **Phase 5: Production Environment Validation**

### **Test 1: Environment Variables**
**Backend Configuration Check**:
```bash
# SSH to AWS instance
docker exec -it {container_name} env | grep -E "(JWT|OAUTH|DATABASE)"
```

**Frontend Configuration Check**:
```bash
# Check Vercel environment variables
BACKEND_URL=https://apifoodsy-backend.com
NEXT_PUBLIC_API_URL=https://apifoodsy-backend.com
```

### **Test 2: Network Connectivity**
```bash
# From AWS instance, test internal connectivity
curl -I localhost:8080/auth/me

# From Vercel function, test backend connectivity  
# (add to API route)
const healthCheck = await fetch(`${BACKEND_URL}/auth/test`);
console.log('Health check:', healthCheck.status);
```

### **Test 3: SSL/TLS Validation**
```bash
# Test SSL certificate validity
openssl s_client -connect apifoodsy-backend.com:443 -servername apifoodsy-backend.com

# Test if there are SSL issues affecting requests
curl -k vs curl (with SSL verification)
```

---

## **Phase 6: Fallback Solutions**

### **Option 1: Direct Backend Calls**
If Vercel API routes continue failing:
```typescript
// Temporarily change frontend to call backend directly
const API_BASE_URL = "https://apifoodsy-backend.com";

// Update CORS configuration to allow direct calls
// Add proper error handling for CORS issues
```

### **Option 2: Alternative Token Storage**
```typescript
// Store tokens in HTTP-only cookies instead of localStorage
// Update frontend to not include Authorization header
// Rely on cookie-based authentication
```

### **Option 3: Session-Based Authentication**
```java
// Fallback to Spring Session if JWT continues failing
// Use Redis or database-backed sessions
// Simplify authentication flow
```

---

## **Success Criteria**

### **Must Work**:
1. ✅ Complete OAuth2 flow without errors
2. ✅ `/api/auth/me` returns user data (200 OK)
3. ✅ Frontend stores and uses access tokens correctly
4. ✅ Token refresh works automatically
5. ✅ Session management persists across page reloads

### **Performance Requirements**:
- OAuth2 flow completes in < 5 seconds
- API calls respond in < 500ms
- No memory leaks or excessive logging

### **Security Requirements**:
- Tokens are properly secured (HttpOnly cookies for refresh)
- CORS is properly configured
- No token exposure in URLs or logs

---

## **Emergency Rollback Plan**

If debugging takes too long:

1. **Revert Recent Changes**:
   - Remove UserDto Jackson annotations
   - Restore original OAuth2SuccessHandler
   - Use original AuthContext logic

2. **Simplified Flow**:
   - Direct backend calls (bypass Vercel proxy)
   - Basic session-based auth
   - Remove JWT complexity temporarily

3. **Minimal Viable Product**:
   - OAuth2 login works
   - Basic session management
   - Core voting functionality

---

## **Tools & Resources**

### **Debugging Tools**:
- Browser DevTools (Network, Console, Application)
- Vercel Function Logs
- AWS CloudWatch Logs
- JWT Debugger (jwt.io)
- PostgreSQL client (psql)

### **Testing Tools**:
- curl for API testing
- Postman for complex request testing
- Browser incognito mode for clean testing
- Network simulation for edge cases

### **Monitoring**:
- Backend application logs
- Nginx access logs
- Database query logs
- Frontend error reporting

---

## **Next Session Action Plan**

1. **Start with Phase 1 tests** (15 minutes)
2. **Deploy current backend changes** with UserDto Jackson annotations
3. **Test complete OAuth2 flow** in clean browser
4. **If still failing**: Move to Phase 2 systematic debugging
5. **Document findings** and iterate

**Time Budget**: 2-3 hours maximum before considering fallback options