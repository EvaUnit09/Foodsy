# How to Modify Services Safely

## Table of Contents
1. [Understanding Services](#understanding-services)
2. [Before You Start](#before-you-start)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Common Patterns](#common-patterns)
5. [Real Examples](#real-examples)
6. [Testing Your Changes](#testing-your-changes)
7. [Common Pitfalls](#common-pitfalls)
8. [Checklist](#checklist)

## Understanding Services

Services in Spring Boot contain the **business logic** of your application. They sit between controllers (which handle HTTP requests) and repositories (which handle database operations).

### What Services Do:
- ✅ Process business rules and logic
- ✅ Coordinate between different repositories
- ✅ Handle transactions (`@Transactional`)
- ✅ Transform data between layers
- ✅ Validate business constraints

### What Services Don't Do:
- ❌ Handle HTTP requests directly (that's for controllers)
- ❌ Contain database queries (that's for repositories)
- ❌ Manage UI state (that's for frontend)
- ❌ Handle authentication (that's for security layer)

## Before You Start

### 1. **Understand the Existing Code**
Before modifying any service, read through it completely:

```java
// Example: UserService.java
@Service
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Constructor injection
    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    // Business methods
    public User createUser(User user) {
        // Business logic here
    }
}
```

### 2. **Identify Dependencies**
Look for:
- `@Autowired` fields or constructor parameters
- Other services being called
- External APIs being used
- Database operations happening

### 3. **Find Related Files**
- **Controller**: What endpoints use this service?
- **Repository**: What data access does it need?
- **DTOs**: What data structures does it work with?
- **Tests**: Are there existing tests?

## Step-by-Step Guide

### Step 1: Backup and Branch
```bash
# Create a new branch for your changes
git checkout -b feature/modify-user-service
```

### Step 2: Identify What Needs to Change

**Example Scenario**: Add email verification to user registration

**Current Code** (in `UserService.java`):
```java
public User createUser(User user) {
    // Hash password
    user.setPassword(passwordEncoder.encode(user.getPassword()));
    
    // Normalize data
    user.setUsername(user.getUsername().toLowerCase().trim());
    user.setEmail(user.getEmail().toLowerCase().trim());
    
    // Save to database
    return userRepository.save(user);
}
```

**What to Change**:
1. Add email verification logic
2. Set user as unverified initially
3. Send verification email
4. Add method to verify email

### Step 3: Plan Your Changes

**Write down what you'll modify**:
1. ✅ Add `emailVerified` field to User entity
2. ✅ Modify `createUser` method to set `emailVerified = false`
3. ✅ Add `sendVerificationEmail` method
4. ✅ Add `verifyEmail` method
5. ✅ Update related DTOs and controllers

### Step 4: Make Incremental Changes

#### 4.1 Add New Dependencies (if needed)
```java
@Service
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService; // NEW DEPENDENCY
    
    @Autowired
    public UserService(
        UserRepository userRepository, 
        PasswordEncoder passwordEncoder,
        EmailService emailService // ADD HERE
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService; // ASSIGN HERE
    }
}
```

#### 4.2 Add New Methods First
```java
/**
 * Send verification email to user
 */
public void sendVerificationEmail(User user) {
    String verificationToken = generateVerificationToken();
    user.setVerificationToken(verificationToken);
    userRepository.save(user);
    
    emailService.sendVerificationEmail(user.getEmail(), verificationToken);
}

/**
 * Verify user email with token
 */
public boolean verifyEmail(String email, String token) {
    Optional<User> userOpt = userRepository.findByEmail(email);
    if (userOpt.isEmpty()) {
        return false;
    }
    
    User user = userOpt.get();
    if (token.equals(user.getVerificationToken())) {
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
        return true;
    }
    
    return false;
}

private String generateVerificationToken() {
    return UUID.randomUUID().toString();
}
```

#### 4.3 Modify Existing Methods Carefully
```java
public User createUser(User user) {
    // Hash password
    user.setPassword(passwordEncoder.encode(user.getPassword()));
    
    // Normalize data
    user.setUsername(user.getUsername().toLowerCase().trim());
    user.setEmail(user.getEmail().toLowerCase().trim());
    
    // NEW: Set email as unverified
    user.setEmailVerified(false);
    
    // Save to database
    User savedUser = userRepository.save(user);
    
    // NEW: Send verification email
    try {
        sendVerificationEmail(savedUser);
    } catch (Exception e) {
        logger.error("Failed to send verification email for user: {}", savedUser.getEmail(), e);
        // Don't fail user creation if email sending fails
    }
    
    return savedUser;
}
```

### Step 5: Update Related Components

#### 5.1 Update Entity (if needed)
```java
@Entity
@Table(name = "users")
public class User {
    // ... existing fields
    
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;
    
    @Column(name = "verification_token")
    private String verificationToken;
    
    // Getters and setters
}
```

#### 5.2 Update DTOs
```java
public record UserDto(
    Long id,
    String username,
    String email,
    String firstName,
    String lastName,
    Boolean emailVerified // ADD THIS
) {
    public static UserDto fromEntity(User user) {
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmailVerified() // ADD THIS
        );
    }
}
```

## Common Patterns

### 1. **Adding New Business Logic**

**Pattern**: Create new private helper methods first, then integrate them:

```java
@Service
public class RestaurantService {
    
    // Add new private method first
    private boolean isRestaurantPopular(Restaurant restaurant) {
        return restaurant.getRating() > 4.0 && 
               restaurant.getUserRatingCount() > 100;
    }
    
    // Then use it in existing methods
    public List<Restaurant> getRecommendations(User user) {
        List<Restaurant> restaurants = restaurantRepository.findByUserPreferences(user);
        
        // NEW: Filter for popular restaurants
        return restaurants.stream()
            .filter(this::isRestaurantPopular)
            .collect(Collectors.toList());
    }
}
```

### 2. **Adding External API Calls**

**Pattern**: Wrap external calls with error handling:

```java
@Service
public class RestaurantCacheService {
    
    public List<Restaurant> getRestaurants(String location) {
        // Try cache first
        List<Restaurant> cached = getCachedRestaurants(location);
        if (!cached.isEmpty()) {
            return cached;
        }
        
        // Call external API with error handling
        try {
            List<Restaurant> restaurants = googlePlacesClient.search(location);
            cacheRestaurants(location, restaurants);
            return restaurants;
        } catch (Exception e) {
            logger.error("Failed to fetch restaurants from Google Places API", e);
            // Return empty list or cached fallback
            return Collections.emptyList();
        }
    }
}
```

### 3. **Adding Validation**

**Pattern**: Create validation methods and call them early:

```java
@Service
public class SessionService {
    
    public Session createSession(Session session) {
        // Validate first
        validateSessionData(session);
        
        // Then process
        session.setJoinCode(generateJoinCode());
        session.setCreatedAt(Instant.now());
        
        return sessionRepository.save(session);
    }
    
    private void validateSessionData(Session session) {
        if (session.getName() == null || session.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Session name is required");
        }
        
        if (session.getName().length() > 100) {
            throw new IllegalArgumentException("Session name too long");
        }
        
        // Add more validations...
    }
}
```

### 4. **Adding Transaction Management**

**Pattern**: Use `@Transactional` on methods that modify multiple entities:

```java
@Service
public class VoteService {
    
    @Transactional
    public void submitVote(VoteRequest voteRequest) {
        // Multiple database operations that should be atomic
        SessionRestaurant restaurant = sessionRestaurantRepository.findById(voteRequest.getRestaurantId())
            .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));
        
        // Update vote count
        restaurant.setLikeCount(restaurant.getLikeCount() + 1);
        sessionRestaurantRepository.save(restaurant);
        
        // Save vote record
        SessionRestaurantVote vote = new SessionRestaurantVote();
        vote.setSessionRestaurant(restaurant);
        vote.setUserId(voteRequest.getUserId());
        vote.setVoteType(VoteType.LIKE);
        voteRepository.save(vote);
        
        // Update user quota
        updateUserVoteQuota(voteRequest.getUserId(), voteRequest.getSessionId());
    }
}
```

## Real Examples

### Example 1: Adding Restaurant Caching

**Goal**: Cache restaurant data to reduce API calls

**Before**:
```java
@Service
public class RestaurantService {
    
    public List<Restaurant> searchRestaurants(String query, String location) {
        return googlePlacesClient.search(query, location);
    }
}
```

**After**:
```java
@Service
public class RestaurantService {
    
    private final RestaurantCacheRepository cacheRepository;
    private final GooglePlacesClient googlePlacesClient;
    
    public List<Restaurant> searchRestaurants(String query, String location) {
        // 1. Check cache first
        List<RestaurantCache> cached = cacheRepository.findByQueryAndLocation(query, location);
        if (!cached.isEmpty() && !isExpired(cached.get(0))) {
            return cached.stream()
                .map(this::convertToRestaurant)
                .collect(Collectors.toList());
        }
        
        // 2. Call API if cache miss
        List<Restaurant> restaurants = googlePlacesClient.search(query, location);
        
        // 3. Cache the results
        cacheResults(query, location, restaurants);
        
        return restaurants;
    }
    
    private void cacheResults(String query, String location, List<Restaurant> restaurants) {
        // Clear old cache
        cacheRepository.deleteByQueryAndLocation(query, location);
        
        // Save new cache
        List<RestaurantCache> cacheEntries = restaurants.stream()
            .map(restaurant -> convertToCache(restaurant, query, location))
            .collect(Collectors.toList());
        
        cacheRepository.saveAll(cacheEntries);
    }
    
    private boolean isExpired(RestaurantCache cache) {
        return cache.getCreatedAt().isBefore(Instant.now().minus(1, ChronoUnit.HOURS));
    }
}
```

### Example 2: Adding User Preference Matching

**Goal**: Match restaurants to user taste preferences

**Before**:
```java
@Service
public class HomepageService {
    
    public List<Restaurant> getRecommendations(Long userId) {
        return restaurantRepository.findRandomRestaurants(10);
    }
}
```

**After**:
```java
@Service
public class HomepageService {
    
    private final UserTastePreferencesRepository tasteRepository;
    private final RestaurantRepository restaurantRepository;
    
    public List<Restaurant> getRecommendations(Long userId) {
        // 1. Get user preferences
        Optional<UserTastePreferences> preferencesOpt = tasteRepository.findByUserId(userId);
        if (preferencesOpt.isEmpty()) {
            // Fall back to random if no preferences
            return restaurantRepository.findRandomRestaurants(10);
        }
        
        UserTastePreferences preferences = preferencesOpt.get();
        
        // 2. Find matching restaurants
        List<Restaurant> matched = restaurantRepository.findByPreferences(
            preferences.getPreferredCuisines(),
            preferences.getPreferredPriceRanges(),
            preferences.getPreferredBorough()
        );
        
        // 3. Score and sort by preference match
        return matched.stream()
            .map(restaurant -> scoreRestaurant(restaurant, preferences))
            .sorted((a, b) -> Double.compare(b.getScore(), a.getScore()))
            .limit(10)
            .map(ScoredRestaurant::getRestaurant)
            .collect(Collectors.toList());
    }
    
    private ScoredRestaurant scoreRestaurant(Restaurant restaurant, UserTastePreferences preferences) {
        double score = 0.0;
        
        // Cuisine match
        if (preferences.getPreferredCuisines().contains(restaurant.getCuisine())) {
            score += 3.0;
        }
        
        // Price match
        if (preferences.getPreferredPriceRanges().contains(restaurant.getPriceLevel())) {
            score += 2.0;
        }
        
        // Borough match
        if (preferences.getPreferredBorough().equals(restaurant.getBorough())) {
            score += 1.0;
        }
        
        // Rating boost
        score += restaurant.getRating() * 0.5;
        
        return new ScoredRestaurant(restaurant, score);
    }
}
```

## Testing Your Changes

### 1. **Unit Tests**
Create or update unit tests for your service methods:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private EmailService emailService;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void createUser_ShouldSetEmailVerifiedToFalse() {
        // Arrange
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("password123");
        
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);
        
        // Act
        User result = userService.createUser(user);
        
        // Assert
        assertFalse(result.getEmailVerified());
        verify(emailService).sendVerificationEmail(anyString(), anyString());
    }
    
    @Test
    void verifyEmail_WithValidToken_ShouldReturnTrue() {
        // Arrange
        User user = new User();
        user.setEmail("test@example.com");
        user.setVerificationToken("valid-token");
        user.setEmailVerified(false);
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        
        // Act
        boolean result = userService.verifyEmail("test@example.com", "valid-token");
        
        // Assert
        assertTrue(result);
        assertTrue(user.getEmailVerified());
        assertNull(user.getVerificationToken());
    }
}
```

### 2. **Integration Tests**
Test the service with real database interactions:

```java
@SpringBootTest
@Transactional
class UserServiceIntegrationTest {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void createUser_ShouldPersistUserCorrectly() {
        // Arrange
        User user = new User();
        user.setUsername("integrationtest");
        user.setEmail("integration@test.com");
        user.setPassword("password123");
        
        // Act
        User savedUser = userService.createUser(user);
        
        // Assert
        assertNotNull(savedUser.getId());
        
        Optional<User> retrieved = userRepository.findById(savedUser.getId());
        assertTrue(retrieved.isPresent());
        assertFalse(retrieved.get().getEmailVerified());
    }
}
```

### 3. **Manual Testing**
1. Start the application
2. Test your changes through the API endpoints
3. Check the database for expected changes
4. Verify error scenarios work correctly

## Common Pitfalls

### 1. **Breaking Existing Functionality**

❌ **DON'T**: Modify method signatures without checking all callers
```java
// This breaks existing code!
public User createUser(User user, boolean sendEmail) { // Added parameter
    // Implementation
}
```

✅ **DO**: Add new overloaded methods or use default parameters
```java
// Keep existing method
public User createUser(User user) {
    return createUser(user, true);
}

// Add new method with additional functionality
public User createUser(User user, boolean sendEmail) {
    // Implementation
}
```

### 2. **Not Handling Transactions Properly**

❌ **DON'T**: Mix transaction boundaries incorrectly
```java
@Service
public class BadService {
    
    public void processOrder(Order order) {
        saveOrder(order);  // This might commit
        sendEmail(order);  // If this fails, order is already saved!
    }
    
    @Transactional
    public void saveOrder(Order order) {
        orderRepository.save(order);
    }
}
```

✅ **DO**: Put `@Transactional` on the outer method
```java
@Service
public class GoodService {
    
    @Transactional
    public void processOrder(Order order) {
        saveOrder(order);   // Part of transaction
        sendEmail(order);   // Part of transaction - if fails, order rolls back
    }
    
    private void saveOrder(Order order) {
        orderRepository.save(order);
    }
}
```

### 3. **Not Handling Errors**

❌ **DON'T**: Let exceptions bubble up unhandled
```java
public List<Restaurant> getRestaurants() {
    return externalApiClient.search("restaurants"); // What if this fails?
}
```

✅ **DO**: Handle exceptions appropriately
```java
public List<Restaurant> getRestaurants() {
    try {
        return externalApiClient.search("restaurants");
    } catch (ApiException e) {
        logger.error("Failed to fetch restaurants from external API", e);
        // Return cached data or empty list
        return getCachedRestaurants();
    }
}
```

### 4. **Creating Circular Dependencies**

❌ **DON'T**: Have services depend on each other in circles
```java
@Service
public class UserService {
    @Autowired
    private SessionService sessionService; // UserService depends on SessionService
}

@Service 
public class SessionService {
    @Autowired
    private UserService userService; // SessionService depends on UserService = CIRCULAR!
}
```

✅ **DO**: Extract common logic or use events
```java
@Service
public class UserService {
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    public User createUser(User user) {
        User saved = userRepository.save(user);
        // Publish event instead of directly calling other service
        eventPublisher.publishEvent(new UserCreatedEvent(saved));
        return saved;
    }
}

@EventListener
@Service
public class SessionService {
    public void handleUserCreated(UserCreatedEvent event) {
        // Handle user creation in session context
    }
}
```

## Checklist

Before committing your service changes, check:

### ✅ **Code Quality**
- [ ] Code follows existing naming conventions
- [ ] Methods have clear, single responsibilities
- [ ] Added proper logging where needed
- [ ] Error handling is appropriate
- [ ] No hardcoded values (use configuration)

### ✅ **Functionality**
- [ ] New functionality works as expected
- [ ] Existing functionality still works
- [ ] Edge cases are handled
- [ ] Invalid inputs are properly validated

### ✅ **Database**
- [ ] Database changes are backward compatible
- [ ] Transactions are used appropriately
- [ ] No N+1 query problems introduced
- [ ] Database constraints are respected

### ✅ **Testing**
- [ ] Unit tests cover new functionality
- [ ] Existing tests still pass
- [ ] Integration tests verify database interactions
- [ ] Manual testing confirms expected behavior

### ✅ **Dependencies**
- [ ] New dependencies are properly injected
- [ ] No circular dependencies created
- [ ] External services are called safely
- [ ] Proper error handling for external calls

### ✅ **Performance**
- [ ] No obvious performance regressions
- [ ] Caching used where appropriate
- [ ] Database queries are optimized
- [ ] Large operations are paginated

### ✅ **Documentation**
- [ ] Added JavaDoc comments for public methods
- [ ] Updated relevant documentation
- [ ] Code is self-documenting with clear variable names

---

## Need Help?

If you're unsure about any changes:

1. **Ask for review**: Get a senior developer to review your changes
2. **Test thoroughly**: Use both unit tests and manual testing
3. **Make small changes**: Break large changes into smaller, reviewable pieces
4. **Check related code**: Look at similar patterns in the codebase

Remember: It's better to ask questions than to break production! 🚀 