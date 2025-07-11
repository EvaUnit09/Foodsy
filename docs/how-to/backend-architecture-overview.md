# Backend Architecture Overview

## Table of Contents
1. [Project Structure](#project-structure)
2. [Architecture Patterns](#architecture-patterns)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Key Technologies](#key-technologies)
5. [Configuration](#configuration)
6. [Security](#security)
7. [Database](#database)
8. [External APIs](#external-apis)

## Project Structure

The foodsy backend follows Spring Boot's standard Maven project structure:

```
backend/
├── src/main/java/com/foodsy/backend/
│   ├── BackendApplication.java          # Main Spring Boot application class
│   ├── client/                          # External API clients
│   │   └── GooglePlacesClient.java      # Google Places API integration
│   ├── config/                          # Configuration classes
│   │   ├── ApiConfig.java               # API configuration
│   │   ├── CorsConfig.java              # CORS settings
│   │   ├── SecurityConfig.java          # Spring Security configuration
│   │   └── WebSocketConfig.java         # WebSocket configuration
│   ├── controller/                      # REST API controllers
│   │   ├── AuthController.java          # Authentication endpoints
│   │   ├── HomepageController.java      # Homepage data endpoints
│   │   ├── RestaurantController.java    # Restaurant search endpoints
│   │   ├── SessionController.java       # Voting session management
│   │   └── VoteController.java          # Voting functionality
│   ├── domain/                          # Entity classes (database models)
│   │   ├── User.java                    # User entity
│   │   ├── Session.java                 # Voting session entity
│   │   ├── RestaurantCache.java         # Cached restaurant data
│   │   └── ...                          # Other entities
│   ├── dto/                             # Data Transfer Objects
│   │   ├── AuthResponse.java            # Authentication response
│   │   ├── HomepageResponseDto.java     # Homepage data response
│   │   ├── RestaurantDto.java           # Restaurant data transfer
│   │   └── ...                          # Other DTOs
│   ├── repository/                      # Data access layer
│   │   ├── UserRepository.java          # User data access
│   │   ├── SessionRepository.java       # Session data access
│   │   └── ...                          # Other repositories
│   ├── security/                        # Security components
│   │   └── JwtAuthenticationFilter.java # JWT token processing
│   ├── service/                         # Business logic layer
│   │   ├── UserService.java             # User management
│   │   ├── SessionService.java          # Session business logic
│   │   ├── RestaurantCacheService.java  # Restaurant caching
│   │   └── ...                          # Other services
│   └── validation/                      # Custom validators
│       ├── PasswordValidator.java       # Password validation
│       └── UsernameValidator.java       # Username validation
└── src/main/resources/
    └── application.properties           # Application configuration
```

## Architecture Patterns

### 1. **Layered Architecture**
The backend follows a clean layered architecture pattern:

```
[Client] → [Controller] → [Service] → [Repository] → [Database]
                ↕            ↕           ↕
            [DTOs]    [Domain/Entity] [JPA/SQL]
```

### 2. **Dependency Injection**
Uses Spring's `@Autowired` annotation for dependency injection:

```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
}
```

### 3. **Repository Pattern**
Data access through Spring Data JPA repositories:

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Boolean existsByUsername(String username);
}
```

## Layer Responsibilities

### Controllers (`@RestController`)
- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Validate request parameters
  - Call appropriate service methods
  - Return proper HTTP status codes
  - Handle authentication context

**Example**: `AuthController.java`
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody SignUpRequest request) {
        // Validate input, call service, return response
    }
}
```

### Services (`@Service`)
- **Purpose**: Contain business logic
- **Responsibilities**:
  - Process business rules
  - Coordinate between repositories
  - Handle transactions
  - Implement complex operations

**Example**: `UserService.java`
```java
@Service
@Transactional
public class UserService {
    public User createUser(User user) {
        // Hash password, normalize data, save to database
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }
}
```

### Repositories (`@Repository`)
- **Purpose**: Data access and persistence
- **Responsibilities**:
  - CRUD operations
  - Custom queries
  - Database interactions

**Example**: `UserRepository.java`
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT u FROM User u WHERE u.email = :email OR u.username = :username")
    Optional<User> findByEmailOrUsername(@Param("email") String email, @Param("username") String username);
}
```

### Entities/Domain (`@Entity`)
- **Purpose**: Represent database tables
- **Responsibilities**:
  - Define table structure
  - Specify relationships
  - Include validation annotations

**Example**: `User.java`
```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
}
```

### DTOs (Data Transfer Objects)
- **Purpose**: Transfer data between layers
- **Responsibilities**:
  - Define API request/response structure
  - Include validation annotations
  - Provide data transformation

**Example**: `AuthResponse.java`
```java
public record AuthResponse(
    String message,
    boolean success,
    UserDto user
) {}
```

## Key Technologies

### Spring Boot Framework
- **@SpringBootApplication**: Main application class
- **@Component, @Service, @Repository, @Controller**: Stereotype annotations
- **@Autowired**: Dependency injection
- **@Transactional**: Transaction management

### Spring Security
- **JWT Authentication**: Token-based authentication
- **OAuth2**: Google login integration
- **CORS Configuration**: Cross-origin resource sharing
- **Password Encoding**: BCrypt for password hashing

### Spring Data JPA
- **@Entity**: Database entity mapping
- **@Repository**: Data access layer
- **@Query**: Custom SQL queries
- **Relationships**: @OneToMany, @ManyToOne, etc.

### Validation
- **@Valid**: Bean validation
- **@NotNull, @NotEmpty**: Field validation
- **Custom Validators**: Business rule validation

## Configuration

### Application Properties
Located in `src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/foodsy
spring.datasource.username=foodsy
spring.datasource.password=password

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT Configuration
jwt.secret=${JWT_SECRET:default-secret}
jwt.expiration-hours=24

# Google Places API
google.places.api.key=${GOOGLE_PLACES_API_KEY}
```

### Security Configuration
In `SecurityConfig.java`:
- CORS settings for frontend communication
- JWT authentication filter
- OAuth2 login configuration
- Endpoint security rules

## Security

### Authentication Flow
1. **User Registration/Login**: Creates JWT tokens
2. **JWT Filter**: Validates tokens on each request
3. **Security Context**: Stores authenticated user info
4. **Authorization**: Controls access to endpoints

### Key Security Features
- **Password Hashing**: BCrypt with salt
- **JWT Tokens**: Access and refresh tokens
- **OAuth2 Integration**: Google login
- **Input Validation**: Prevents injection attacks
- **CORS Configuration**: Secure cross-origin requests

## Database

### JPA Entity Relationships
```java
// User -> UserTastePreferences (One-to-One)
@Entity
public class User {
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserTastePreferences tastePreferences;
}

// Session -> SessionRestaurants (One-to-Many)
@Entity
public class Session {
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    private List<SessionRestaurant> restaurants;
}
```

### Repository Queries
```java
// Custom query with parameters
@Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.expiresAt > :now")
List<RestaurantCache> findByBoroughNotExpired(@Param("borough") String borough, @Param("now") Instant now);
```

## External APIs

### Google Places API Integration
Located in `GooglePlacesClient.java`:

```java
@Component
public class GooglePlacesClient {
    public GooglePlacesSearchResponse search(String near, String query) {
        // Call Google Places API
        // Transform response
        // Return standardized data
    }
}
```

### API Quota Management
- **Conservative Usage**: Stays within 60% of free tier limits
- **Caching Strategy**: 30-day restaurant cache
- **Fallback Data**: Mock responses when API unavailable

## Best Practices for Junior Engineers

### 1. **Always Follow the Layer Pattern**
```java
// ❌ DON'T: Call repository directly from controller
@GetMapping("/users")
public List<User> getUsers() {
    return userRepository.findAll(); // BAD
}

// ✅ DO: Call service from controller
@GetMapping("/users")
public List<UserDto> getUsers() {
    return userService.getAllUsers(); // GOOD
}
```

### 2. **Use DTOs for API Responses**
```java
// ❌ DON'T: Return entities directly
public ResponseEntity<User> getUser() {
    return ResponseEntity.ok(userService.findById(id)); // BAD - exposes internal structure
}

// ✅ DO: Return DTOs
public ResponseEntity<UserDto> getUser() {
    return ResponseEntity.ok(userService.getUserDto(id)); // GOOD - controlled data exposure
}
```

### 3. **Handle Errors Properly**
```java
// ✅ DO: Proper error handling
try {
    User user = userService.createUser(userData);
    return ResponseEntity.ok(convertToDto(user));
} catch (EmailAlreadyExistsException e) {
    return ResponseEntity.badRequest()
        .body(new ErrorResponse("Email already exists"));
}
```

### 4. **Use Transactions for Business Operations**
```java
@Service
@Transactional  // Ensures data consistency
public class SessionService {
    public Session createSessionWithRestaurants(SessionData data) {
        Session session = sessionRepository.save(createSession(data));
        restaurantService.addRestaurantsToSession(session.getId(), data.getRestaurants());
        return session;
    }
}
```

## Next Steps

After understanding this overview, refer to these specific guides:
- [How to Modify Services](./how-to-modify-services.md)
- [How to Modify Controllers](./how-to-modify-controllers.md)
- [How to Modify DTOs and Entities](./how-to-modify-dtos-and-entities.md)
- [Database and JPA Guide](./database-and-jpa-guide.md) 