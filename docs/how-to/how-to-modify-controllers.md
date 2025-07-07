# How to Modify Controllers Safely

## Table of Contents
1. [Understanding Controllers](#understanding-controllers)
2. [Before You Start](#before-you-start)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Common Patterns](#common-patterns)
5. [Real Examples](#real-examples)
6. [Testing Your Changes](#testing-your-changes)
7. [Common Pitfalls](#common-pitfalls)
8. [API Design Best Practices](#api-design-best-practices)
9. [Checklist](#checklist)

## Understanding Controllers

Controllers in Spring Boot are the **entry point** for HTTP requests. They handle incoming requests, call business logic in services, and return appropriate responses.

### What Controllers Do:
- ✅ Handle HTTP requests (GET, POST, PUT, DELETE)
- ✅ Validate request parameters and body
- ✅ Call service methods for business logic
- ✅ Transform service results to DTOs
- ✅ Return proper HTTP status codes
- ✅ Handle authentication context

### What Controllers Don't Do:
- ❌ Contain business logic (that's for services)
- ❌ Directly access repositories (use services instead)
- ❌ Handle database transactions (use services)
- ❌ Process complex data transformations (use services/DTOs)

## Before You Start

### 1. **Understand the Existing Controller**
Read through the entire controller class:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    
    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        // Implementation
    }
    
    @PostMapping
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        // Implementation
    }
}
```

### 2. **Identify the API Contract**
Understand:
- **Base URL pattern**: `/api/users`
- **Existing endpoints**: What operations are already available?
- **Request/Response formats**: What DTOs are used?
- **Authentication requirements**: Which endpoints need auth?
- **Status codes**: What codes are returned in different scenarios?

### 3. **Check API Documentation**
Look for:
- Swagger/OpenAPI documentation
- Frontend code that calls these endpoints
- Integration tests that validate the API
- Postman collections or similar

## Step-by-Step Guide

### Step 1: Plan Your Changes

**Example Scenario**: Add email verification endpoints to UserController

**Existing endpoints**:
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create new user

**New endpoints to add**:
- `POST /api/users/{id}/send-verification` - Send verification email
- `POST /api/users/verify-email` - Verify email with token

### Step 2: Create DTOs First

Before modifying the controller, create any new DTOs you'll need:

```java
// Request DTO for email verification
public record VerifyEmailRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,
    
    @NotBlank(message = "Token is required")
    String token
) {}

// Response DTO for verification result
public record VerificationResponse(
    boolean success,
    String message
) {}
```

### Step 3: Add New Endpoints Incrementally

#### 3.1 Add Simple Endpoints First
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    
    // ... existing code ...
    
    /**
     * Send verification email to user
     * POST /api/users/{id}/send-verification
     */
    @PostMapping("/{id}/send-verification")
    public ResponseEntity<VerificationResponse> sendVerificationEmail(
            @PathVariable Long id,
            Authentication authentication) {
        
        try {
            // Validate user can request verification for this ID
            if (!canUserAccessProfile(id, authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new VerificationResponse(false, "Access denied"));
            }
            
            // Call service to send email
            userService.sendVerificationEmail(id);
            
            return ResponseEntity.ok(
                new VerificationResponse(true, "Verification email sent")
            );
            
        } catch (UserNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error sending verification email for user {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new VerificationResponse(false, "Failed to send verification email"));
        }
    }
    
    private boolean canUserAccessProfile(Long userId, Authentication auth) {
        // Add your authorization logic here
        return auth != null && auth.isAuthenticated();
    }
}
```

#### 3.2 Add More Complex Endpoints
```java
/**
 * Verify user email with token
 * POST /api/users/verify-email
 */
@PostMapping("/verify-email")
public ResponseEntity<VerificationResponse> verifyEmail(
        @Valid @RequestBody VerifyEmailRequest request) {
    
    try {
        // Validate input
        if (request.email() == null || request.token() == null) {
            return ResponseEntity.badRequest()
                .body(new VerificationResponse(false, "Email and token are required"));
        }
        
        // Call service to verify
        boolean verified = userService.verifyEmail(request.email(), request.token());
        
        if (verified) {
            return ResponseEntity.ok(
                new VerificationResponse(true, "Email verified successfully")
            );
        } else {
            return ResponseEntity.badRequest()
                .body(new VerificationResponse(false, "Invalid verification token"));
        }
        
    } catch (Exception e) {
        logger.error("Error verifying email for {}", request.email(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new VerificationResponse(false, "Verification failed"));
    }
}
```

### Step 4: Update Existing Endpoints (If Needed)

When modifying existing endpoints, be very careful:

```java
@GetMapping("/{id}")
public ResponseEntity<UserDto> getUser(@PathVariable Long id, Authentication authentication) {
    try {
        User user = userService.findById(id);
        
        // NEW: Check if user can view this profile
        if (!canUserViewProfile(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        UserDto userDto = UserDto.fromEntity(user);
        return ResponseEntity.ok(userDto);
        
    } catch (UserNotFoundException e) {
        return ResponseEntity.notFound().build();
    } catch (Exception e) {
        logger.error("Error retrieving user {}", id, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

## Common Patterns

### 1. **Standard CRUD Operations**

```java
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    
    // GET /api/restaurants - List all
    @GetMapping
    public ResponseEntity<List<RestaurantDto>> getAllRestaurants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Restaurant> restaurants = restaurantService.findAll(pageRequest);
        
        List<RestaurantDto> dtos = restaurants.getContent().stream()
            .map(RestaurantDto::fromEntity)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(dtos);
    }
    
    // GET /api/restaurants/{id} - Get by ID
    @GetMapping("/{id}")
    public ResponseEntity<RestaurantDto> getRestaurant(@PathVariable Long id) {
        return restaurantService.findById(id)
            .map(restaurant -> ResponseEntity.ok(RestaurantDto.fromEntity(restaurant)))
            .orElse(ResponseEntity.notFound().build());
    }
    
    // POST /api/restaurants - Create new
    @PostMapping
    public ResponseEntity<RestaurantDto> createRestaurant(
            @Valid @RequestBody CreateRestaurantRequest request) {
        
        Restaurant restaurant = restaurantService.createRestaurant(request);
        RestaurantDto dto = RestaurantDto.fromEntity(restaurant);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
    
    // PUT /api/restaurants/{id} - Update existing
    @PutMapping("/{id}")
    public ResponseEntity<RestaurantDto> updateRestaurant(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRestaurantRequest request) {
        
        try {
            Restaurant updated = restaurantService.updateRestaurant(id, request);
            return ResponseEntity.ok(RestaurantDto.fromEntity(updated));
        } catch (RestaurantNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // DELETE /api/restaurants/{id} - Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRestaurant(@PathVariable Long id) {
        try {
            restaurantService.deleteRestaurant(id);
            return ResponseEntity.noContent().build();
        } catch (RestaurantNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
```

### 2. **Query Parameters and Filtering**

```java
@GetMapping("/search")
public ResponseEntity<List<RestaurantDto>> searchRestaurants(
        @RequestParam(required = false) String name,
        @RequestParam(required = false) String cuisine,
        @RequestParam(required = false) String priceLevel,
        @RequestParam(required = false) String borough,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    
    // Build search criteria
    RestaurantSearchCriteria criteria = RestaurantSearchCriteria.builder()
        .name(name)
        .cuisine(cuisine)
        .priceLevel(priceLevel)
        .borough(borough)
        .build();
    
    PageRequest pageRequest = PageRequest.of(page, size);
    Page<Restaurant> results = restaurantService.search(criteria, pageRequest);
    
    List<RestaurantDto> dtos = results.getContent().stream()
        .map(RestaurantDto::fromEntity)
        .collect(Collectors.toList());
        
    return ResponseEntity.ok(dtos);
}
```

### 3. **File Upload Handling**

```java
@PostMapping("/{id}/photo")
public ResponseEntity<PhotoUploadResponse> uploadPhoto(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        Authentication authentication) {
    
    try {
        // Validate file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(new PhotoUploadResponse(false, "File is empty"));
        }
        
        if (!isImageFile(file)) {
            return ResponseEntity.badRequest()
                .body(new PhotoUploadResponse(false, "Only image files are allowed"));
        }
        
        // Check authorization
        if (!canUserUploadPhoto(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new PhotoUploadResponse(false, "Access denied"));
        }
        
        // Process upload
        String photoUrl = restaurantService.uploadPhoto(id, file);
        
        return ResponseEntity.ok(
            new PhotoUploadResponse(true, "Photo uploaded successfully", photoUrl)
        );
        
    } catch (Exception e) {
        logger.error("Error uploading photo for restaurant {}", id, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new PhotoUploadResponse(false, "Upload failed"));
    }
}

private boolean isImageFile(MultipartFile file) {
    String contentType = file.getContentType();
    return contentType != null && contentType.startsWith("image/");
}
```

### 4. **Async Operations**

```java
@PostMapping("/{id}/process")
public ResponseEntity<ProcessingResponse> processRestaurant(
        @PathVariable Long id,
        @RequestBody ProcessingRequest request) {
    
    try {
        // Start async processing
        CompletableFuture<ProcessingResult> future = restaurantService.processAsync(id, request);
        
        // Return immediately with processing ID
        String processingId = UUID.randomUUID().toString();
        processingTracker.track(processingId, future);
        
        return ResponseEntity.accepted()
            .body(new ProcessingResponse(processingId, "Processing started"));
            
    } catch (Exception e) {
        logger.error("Error starting processing for restaurant {}", id, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ProcessingResponse(null, "Failed to start processing"));
    }
}

@GetMapping("/processing/{processingId}/status")
public ResponseEntity<ProcessingStatusResponse> getProcessingStatus(
        @PathVariable String processingId) {
    
    ProcessingStatus status = processingTracker.getStatus(processingId);
    
    if (status == null) {
        return ResponseEntity.notFound().build();
    }
    
    return ResponseEntity.ok(new ProcessingStatusResponse(
        processingId,
        status.isComplete(),
        status.getProgress(),
        status.getMessage()
    ));
}
```

## Real Examples

### Example 1: Adding Session Management Endpoints

**Goal**: Add endpoints to manage voting sessions

**New endpoints needed**:
- `POST /api/sessions` - Create session
- `POST /api/sessions/{joinCode}/join` - Join session
- `POST /api/sessions/{id}/start` - Start session
- `GET /api/sessions/{id}/status` - Get session status

```java
@RestController
@RequestMapping("/api/sessions")
public class SessionController {
    
    private final SessionService sessionService;
    private final SessionParticipantService participantService;
    
    @PostMapping
    public ResponseEntity<SessionDto> createSession(
            @Valid @RequestBody CreateSessionRequest request,
            Principal principal) {
        
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Session session = sessionService.createSession(request, principal.getName());
            SessionDto dto = SessionDto.fromEntity(session);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
            
        } catch (Exception e) {
            logger.error("Error creating session for user {}", principal.getName(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/{joinCode}/join")
    public ResponseEntity<JoinSessionResponse> joinSession(
            @PathVariable String joinCode,
            @Valid @RequestBody JoinSessionRequest request) {
        
        try {
            // Validate join code format
            if (!isValidJoinCode(joinCode)) {
                return ResponseEntity.badRequest()
                    .body(new JoinSessionResponse(false, "Invalid join code format"));
            }
            
            // Attempt to join
            SessionParticipant participant = participantService.joinSession(joinCode, request);
            
            return ResponseEntity.ok(new JoinSessionResponse(
                true,
                "Successfully joined session",
                participant.getSessionId(),
                participant.getUserId()
            ));
            
        } catch (SessionNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (SessionFullException e) {
            return ResponseEntity.badRequest()
                .body(new JoinSessionResponse(false, "Session is full"));
        } catch (Exception e) {
            logger.error("Error joining session with code {}", joinCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new JoinSessionResponse(false, "Failed to join session"));
        }
    }
    
    @PostMapping("/{id}/start")
    public ResponseEntity<Void> startSession(
            @PathVariable Long id,
            Principal principal) {
        
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            // Check if user is the session creator
            Session session = sessionService.findById(id);
            if (!session.getCreatorId().equals(principal.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            sessionService.startSession(id);
            return ResponseEntity.ok().build();
            
        } catch (SessionNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (SessionAlreadyStartedException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
```

### Example 2: Adding Homepage Analytics Endpoints

**Goal**: Add analytics endpoints for homepage data

```java
@RestController
@RequestMapping("/api/homepage")
public class HomepageController {
    
    // ... existing endpoints ...
    
    /**
     * Track user interaction with restaurant
     * POST /api/homepage/analytics/restaurant-click
     */
    @PostMapping("/analytics/restaurant-click")
    public ResponseEntity<Void> trackRestaurantClick(
            @Valid @RequestBody RestaurantClickRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            // Extract user info
            String sessionId = extractSessionId(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            String ipAddress = getClientIpAddress(httpRequest);
            
            // Track the click
            HomepageAnalyticsDto analytics = HomepageAnalyticsDto.builder()
                .sessionId(sessionId)
                .restaurantId(request.restaurantId())
                .action("restaurant_click")
                .section(request.section())
                .position(request.position())
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .build();
                
            analyticsService.trackEvent(analytics);
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error tracking restaurant click", e);
            // Don't fail the request if analytics fails
            return ResponseEntity.ok().build();
        }
    }
    
    /**
     * Get homepage analytics (admin only)
     * GET /api/homepage/analytics
     */
    @GetMapping("/analytics")
    public ResponseEntity<HomepageAnalyticsResponse> getAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        
        // Check admin permissions
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        try {
            // Set default date range if not provided
            if (from == null) {
                from = LocalDate.now().minusDays(30);
            }
            if (to == null) {
                to = LocalDate.now();
            }
            
            HomepageAnalyticsResponse analytics = analyticsService.getAnalytics(from, to);
            return ResponseEntity.ok(analytics);
            
        } catch (Exception e) {
            logger.error("Error retrieving homepage analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    private String extractSessionId(HttpServletRequest request) {
        // Try to get from header first
        String sessionId = request.getHeader("X-Session-ID");
        if (sessionId != null) {
            return sessionId;
        }
        
        // Fall back to generating one
        return "anonymous_" + System.currentTimeMillis();
    }
    
    private boolean hasAdminRole(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }
}
```

## Testing Your Changes

### 1. **Unit Tests**

Test controller methods in isolation:

```java
@ExtendWith(MockitoExtension.class)
class UserControllerTest {
    
    @Mock
    private UserService userService;
    
    @InjectMocks
    private UserController userController;
    
    @Test
    void sendVerificationEmail_WithValidId_ShouldReturnSuccess() {
        // Arrange
        Long userId = 1L;
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn("testuser");
        
        doNothing().when(userService).sendVerificationEmail(userId);
        
        // Act
        ResponseEntity<VerificationResponse> response = 
            userController.sendVerificationEmail(userId, auth);
        
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().success());
        verify(userService).sendVerificationEmail(userId);
    }
    
    @Test
    void verifyEmail_WithInvalidToken_ShouldReturnBadRequest() {
        // Arrange
        VerifyEmailRequest request = new VerifyEmailRequest("test@example.com", "invalid-token");
        when(userService.verifyEmail("test@example.com", "invalid-token")).thenReturn(false);
        
        // Act
        ResponseEntity<VerificationResponse> response = userController.verifyEmail(request);
        
        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
    }
}
```

### 2. **Integration Tests**

Test the full HTTP request/response cycle:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void createUser_WithValidData_ShouldCreateUser() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest(
            "testuser",
            "test@example.com",
            "password123",
            "Test",
            "User"
        );
        
        // Act
        ResponseEntity<UserDto> response = restTemplate.postForEntity(
            "/api/users",
            request,
            UserDto.class
        );
        
        // Assert
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("testuser", response.getBody().username());
        
        // Verify in database
        Optional<User> savedUser = userRepository.findByUsername("testuser");
        assertTrue(savedUser.isPresent());
    }
}
```

### 3. **Manual Testing with Postman/curl**

```bash
# Test creating a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test sending verification email
curl -X POST http://localhost:8080/api/users/1/send-verification \
  -H "Authorization: Bearer <your-jwt-token>"

# Test verifying email
curl -X POST http://localhost:8080/api/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "verification-token-here"
  }'
```

## Common Pitfalls

### 1. **Not Using Proper HTTP Status Codes**

❌ **DON'T**: Always return 200 OK
```java
@PostMapping
public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
    User user = userService.createUser(request);
    UserDto dto = UserDto.fromEntity(user);
    return ResponseEntity.ok(dto); // WRONG - should be 201 CREATED
}
```

✅ **DO**: Use appropriate status codes
```java
@PostMapping
public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
    User user = userService.createUser(request);
    UserDto dto = UserDto.fromEntity(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(dto); // CORRECT
}
```

### 2. **Exposing Internal Entities**

❌ **DON'T**: Return entity objects directly
```java
@GetMapping("/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    return ResponseEntity.ok(user); // WRONG - exposes internal structure
}
```

✅ **DO**: Use DTOs for API responses
```java
@GetMapping("/{id}")
public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    UserDto dto = UserDto.fromEntity(user);
    return ResponseEntity.ok(dto); // CORRECT - controlled data exposure
}
```

### 3. **Poor Error Handling**

❌ **DON'T**: Let exceptions bubble up unhandled
```java
@GetMapping("/{id}")
public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
    User user = userService.findById(id); // What if this throws?
    return ResponseEntity.ok(UserDto.fromEntity(user));
}
```

✅ **DO**: Handle exceptions appropriately
```java
@GetMapping("/{id}")
public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
    try {
        User user = userService.findById(id);
        return ResponseEntity.ok(UserDto.fromEntity(user));
    } catch (UserNotFoundException e) {
        return ResponseEntity.notFound().build();
    } catch (Exception e) {
        logger.error("Error retrieving user {}", id, e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
}
```

### 4. **Missing Validation**

❌ **DON'T**: Skip request validation
```java
@PostMapping
public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
    // No validation - dangerous!
    User user = userService.createUser(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.fromEntity(user));
}
```

✅ **DO**: Validate all inputs
```java
@PostMapping
public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
    // @Valid triggers validation based on annotations in CreateUserRequest
    User user = userService.createUser(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.fromEntity(user));
}
```

## API Design Best Practices

### 1. **RESTful URL Design**

✅ **Good URL patterns**:
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get specific user
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `POST /api/users/{id}/send-verification` - Action on user

❌ **Avoid**:
- `GET /api/getUsers` - Don't use verbs in URLs
- `POST /api/users/create` - Redundant with HTTP method
- `GET /api/user/{id}` - Use plural form

### 2. **Consistent Response Format**

```java
// Standard success response
{
  "data": { ... },
  "message": "Success",
  "timestamp": "2024-01-01T12:00:00Z"
}

// Standard error response
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 not found",
    "details": { ... }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 3. **Pagination for Collections**

```java
@GetMapping
public ResponseEntity<PagedResponse<UserDto>> getUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "id") String sortBy,
        @RequestParam(defaultValue = "asc") String sortDir) {
    
    Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? 
        Sort.Direction.DESC : Sort.Direction.ASC;
    PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, sortBy));
    
    Page<User> userPage = userService.findAll(pageRequest);
    
    List<UserDto> dtos = userPage.getContent().stream()
        .map(UserDto::fromEntity)
        .collect(Collectors.toList());
    
    PagedResponse<UserDto> response = new PagedResponse<>(
        dtos,
        userPage.getNumber(),
        userPage.getSize(),
        userPage.getTotalElements(),
        userPage.getTotalPages(),
        userPage.isLast()
    );
    
    return ResponseEntity.ok(response);
}
```

## Checklist

Before committing your controller changes:

### ✅ **API Design**
- [ ] URLs follow RESTful conventions
- [ ] HTTP methods are used appropriately
- [ ] Status codes are correct for each scenario
- [ ] Request/response formats are consistent
- [ ] Pagination is implemented for collections

### ✅ **Input Validation**
- [ ] All request bodies are validated with `@Valid`
- [ ] Path variables are validated (type, format)
- [ ] Query parameters have sensible defaults
- [ ] File uploads are validated (size, type)

### ✅ **Error Handling**
- [ ] All exceptions are caught and handled
- [ ] Appropriate HTTP status codes are returned
- [ ] Error messages are user-friendly
- [ ] Sensitive information is not exposed in errors

### ✅ **Security**
- [ ] Authentication is checked where required
- [ ] Authorization rules are implemented
- [ ] Input sanitization prevents injection attacks
- [ ] CORS is configured if needed

### ✅ **Documentation**
- [ ] JavaDoc comments for public methods
- [ ] API documentation is updated
- [ ] Request/response examples are provided

### ✅ **Testing**
- [ ] Unit tests cover all endpoints
- [ ] Integration tests verify full request flow
- [ ] Error scenarios are tested
- [ ] Manual testing with various inputs

### ✅ **Performance**
- [ ] Database queries are optimized
- [ ] Appropriate caching headers are set
- [ ] Large responses are paginated
- [ ] Async operations where appropriate

---

## Need Help?

If you're unsure about any controller changes:

1. **Check existing patterns**: Look at similar endpoints in the codebase
2. **Review HTTP standards**: Ensure you're following REST conventions
3. **Test thoroughly**: Both happy path and error scenarios
4. **Get feedback**: Have others review your API design

Remember: A well-designed API is easy to use and hard to misuse! 🚀 