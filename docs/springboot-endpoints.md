# Foodsy Spring Boot API Endpoints

## 🔗 **Base URL**: `http://localhost:8080/api`

---

## 🏠 **Hello Controller**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hello` | Health check endpoint |

---

## 🔐 **Authentication Controller** (`/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/signup` | Register new user | ❌ |
| `POST` | `/auth/login` | Login user | ❌ |
| `GET` | `/auth/me` | Get current user info | ✅ |
| `POST` | `/auth/check-availability` | Check username/email availability | ❌ |
| `POST` | `/auth/logout` | Logout user | ✅ |
| `POST` | `/auth/refresh` | Refresh JWT token | ❌ |

---

## 🍕 **Restaurant Controller** (`/restaurants`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/restaurants?near={location}&query={search}` | Search restaurants | ❌ |
| `POST` | `/restaurants` | Create session (legacy) | ✅ |
| `GET` | `/restaurants/{providerId}/photos?limit={num}` | Get restaurant photos | ❌ |
| `GET` | `/restaurants/photos/{placeId}/{photoId}?maxHeightPx={num}&maxWidthPx={num}` | Proxy restaurant photo | ❌ |

---

## 🎯 **Session Controller** (`/sessions`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/sessions` | Create new session | ✅ |
| `GET` | `/sessions/{id}` | Get session details | ❌ |
| `GET` | `/sessions/{id}/participants` | Get session participants | ❌ |
| `GET` | `/sessions/{id}/restaurants` | Get session restaurants | ❌ |
| `POST` | `/sessions/{id}/participants` | Add participant to session | ✅ |
| `POST` | `/sessions/{code}/join` | Join session by code | ✅ |
| `POST` | `/sessions/{id}/restaurants/{providerId}/vote` | Vote for restaurant | ✅ |
| `GET` | `/sessions/{id}/remaining-votes` | Get user's remaining votes | ✅ |
| `DELETE` | `/sessions/{id}/reset-votes` | Reset user's votes | ✅ |
| `GET` | `/sessions/{id}/voting-status` | Get voting status | ❌ |

---

## 🏠 **Homepage Controller** (`/homepage`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/homepage` | Get homepage data | ❌ |
| `GET` | `/homepage/taste-profile` | Get user's taste profile | ✅ |
| `POST` | `/homepage/taste-profile` | Save taste profile | ✅ |
| `GET` | `/homepage/taste-profile/completed` | Check if onboarding completed | ✅ |
| `GET` | `/homepage/taste-profile/options` | Get taste profile options | ❌ |
| `POST` | `/homepage/analytics` | Track analytics event | ❌ |
| `POST` | `/homepage/analytics/card-click` | Track card click | ❌ |
| `POST` | `/homepage/analytics/session-start` | Track session start | ❌ |
| `GET` | `/homepage/stats` | Get homepage stats | ✅ |
| `GET` | `/homepage/analytics/summary?days={num}` | Get analytics summary | ✅ |
| `GET` | `/homepage/analytics/funnel?days={num}` | Get conversion funnel | ✅ |
| `POST` | `/homepage/refresh/{borough}` | Refresh borough data | ✅ |
| `GET` | `/homepage/test` | Test endpoint | ❌ |
| `GET` | `/homepage/health` | Health check | ❌ |

---

## 🗳️ **Vote Controller** (`/votes`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/votes` | Submit vote | ✅ |

---

## 🔑 **OAuth2 Controller** (`/oauth2`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/oauth2/user` | Get OAuth2 user info | ✅ |

---

## 📡 **WebSocket Endpoints**

### **Session Events Controller**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `WS` | `/app/session/{sessionId}/start` | Start session |
| `WS` | `/app/session/{sessionId}/timerUpdate` | Timer update |
| `WS` | `/app/session/{sessionId}/completeRound1` | Complete round 1 |
| `WS` | `/app/session/{sessionId}/completeRound2` | Complete round 2 |
| `WS` | `/app/session/{sessionId}/getRoundStatus` | Get round status |
| `WS` | `/app/session/{sessionId}/roundTransition` | Round transition |
| `WS` | `/app/session/{sessionId}/end` | End session |

### **WebSocket Topics**
| Topic | Description |
|-------|-------------|
| `/topic/session/{sessionId}` | Session-specific events |
| `/topic/test` | Test messages |

---

## 🔧 **OAuth2 Redirect Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/login/oauth2/code/google` | Google OAuth2 callback |

---

## 📊 **API Summary**

### **Total Endpoints**: 35+
- **REST API**: 30+ endpoints
- **WebSocket**: 7 endpoints
- **OAuth2**: 2 endpoints

### **Authentication Requirements**:
- **Public endpoints**: 15+ (no auth required)
- **Protected endpoints**: 20+ (auth required)

### **Main Features**:
- ✅ User authentication & authorization
- ✅ Session management
- ✅ Restaurant search & photos
- ✅ Voting system
- ✅ Real-time WebSocket communication
- ✅ Analytics tracking
- ✅ Taste profile management
- ✅ OAuth2 integration

---

## 🚀 **Usage Examples**

### **Create Session**
```bash
curl -X POST http://localhost:8080/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"creatorId":"user123","likesPerUser":3}'
```

### **Search Restaurants**
```bash
curl "http://localhost:8080/api/restaurants?near=New%20York&query=pizza"
```

### **Get Homepage Data**
```bash
curl http://localhost:8080/api/homepage
```

### **Join Session**
```bash
curl -X POST http://localhost:8080/api/sessions/ABC123/join
``` 