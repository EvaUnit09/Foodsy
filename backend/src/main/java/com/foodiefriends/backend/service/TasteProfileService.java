package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.User;
import com.foodiefriends.backend.domain.UserTastePreferences;
import com.foodiefriends.backend.dto.TasteProfileDto;
import com.foodiefriends.backend.repository.UserTastePreferencesRepository;
import com.foodiefriends.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class TasteProfileService {

    private static final Logger logger = LoggerFactory.getLogger(TasteProfileService.class);

    @Autowired
    private UserTastePreferencesRepository tastePreferencesRepository;

    @Autowired
    private UserRepository userRepository;

    // Available options for frontend
    public static final Set<String> AVAILABLE_CUISINES = Set.of(
        "Italian", "Chinese", "Mexican", "American", "Thai", "Indian", 
        "Japanese", "Korean", "Mediterranean", "French", "Vegan", "Vegetarian",
        "Greek", "Vietnamese", "Turkish", "Lebanese", "Spanish", "Brazilian"
    );

    public static final Set<String> AVAILABLE_PRICE_RANGES = Set.of("$", "$$", "$$$");

    public static final Set<String> AVAILABLE_BOROUGHS = Set.of(
        "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"
    );

    /**
     * Get user's taste profile
     */
    public Optional<TasteProfileDto> getUserTasteProfile(Long userId) {
        logger.debug("Getting taste profile for user: {}", userId);
        
        Optional<UserTastePreferences> preferences = tastePreferencesRepository.findByUserId(userId);
        return preferences.map(TasteProfileDto::fromEntity);
    }

    /**
     * Check if user has completed taste profile onboarding
     */
    public boolean hasCompletedOnboarding(Long userId) {
        Optional<UserTastePreferences> preferences = tastePreferencesRepository.findByUserId(userId);
        return preferences.map(p -> p.getPreferredCuisines() != null && 
                                   !p.getPreferredCuisines().isEmpty() &&
                                   p.getPriceRange() != null && 
                                   p.getPreferredBorough() != null).orElse(false);
    }

    /**
     * Create or update user's taste profile
     */
    @Transactional
    public TasteProfileDto saveOrUpdateTasteProfile(Long userId, TasteProfileDto profileDto) {
        logger.info("Saving taste profile for user: {}", userId);

        // Validate input
        validateTasteProfile(profileDto);

        // Get user
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // Find existing preferences or create new
        UserTastePreferences preferences = tastePreferencesRepository.findByUserId(userId)
            .orElse(new UserTastePreferences());

        // Update preferences
        preferences.setUser(user);
        preferences.setPreferredCuisines(profileDto.getPreferredCuisines());
        preferences.setPriceRange(profileDto.getPriceRange());
        preferences.setPreferredBorough(profileDto.getPreferredBorough());

        // Save to database
        preferences = tastePreferencesRepository.save(preferences);

        logger.info("Successfully saved taste profile for user: {} with {} cuisines, price range: {}, borough: {}", 
                   userId, preferences.getPreferredCuisines().size(), 
                   preferences.getPriceRange(), preferences.getPreferredBorough());

        return TasteProfileDto.fromEntity(preferences);
    }

    /**
     * Delete user's taste profile
     */
    @Transactional
    public void deleteTasteProfile(Long userId) {
        logger.info("Deleting taste profile for user: {}", userId);
        
        tastePreferencesRepository.findByUserId(userId)
            .ifPresent(preferences -> {
                tastePreferencesRepository.delete(preferences);
                logger.info("Successfully deleted taste profile for user: {}", userId);
            });
    }

    /**
     * Find users with similar taste preferences
     */
    public List<UserTastePreferences> findSimilarUsers(Long userId, int limit) {
        logger.debug("Finding similar users for user: {}", userId);
        
        Optional<UserTastePreferences> userPreferences = tastePreferencesRepository.findByUserId(userId);
        if (userPreferences.isEmpty()) {
            return List.of();
        }

        UserTastePreferences prefs = userPreferences.get();
        List<UserTastePreferences> similarUsers = tastePreferencesRepository
            .findSimilarUsers(prefs.getPreferredBorough(), prefs.getPriceRange());

        // Remove the current user from results
        similarUsers.removeIf(similar -> similar.getUser().getId().equals(userId));

        // Limit results
        return similarUsers.stream().limit(limit).toList();
    }

    /**
     * Get users who prefer specific cuisines (for recommendation engine)
     */
    public List<UserTastePreferences> getUsersPreferringCuisine(String cuisine) {
        logger.debug("Finding users who prefer cuisine: {}", cuisine);
        return tastePreferencesRepository.findUsersByCuisine(cuisine);
    }

    /**
     * Get users in a specific borough
     */
    public List<UserTastePreferences> getUsersInBorough(String borough) {
        logger.debug("Finding users in borough: {}", borough);
        return tastePreferencesRepository.findUsersInBorough(borough);
    }

    /**
     * Get statistics about user preferences
     */
    public TasteProfileStats getStatistics() {
        logger.debug("Getting taste profile statistics");
        
        List<Object[]> boroughStats = tastePreferencesRepository.countUsersByBorough();
        List<Object[]> priceStats = tastePreferencesRepository.countUsersByPriceRange();
        List<UserTastePreferences> veganVegetarianUsers = tastePreferencesRepository.findVeganVegetarianUsers();

        return new TasteProfileStats(boroughStats, priceStats, veganVegetarianUsers.size());
    }

    /**
     * Get personalized restaurant criteria based on user preferences
     */
    public RestaurantSearchCriteria getPersonalizedCriteria(Long userId) {
        logger.debug("Getting personalized criteria for user: {}", userId);
        
        Optional<UserTastePreferences> preferences = tastePreferencesRepository.findByUserId(userId);
        if (preferences.isEmpty()) {
            // Return default criteria for users without preferences
            return new RestaurantSearchCriteria(
                "Manhattan", // Default borough
                null, // No price filter
                null, // No cuisine filter
                4.0 // Minimum rating
            );
        }

        UserTastePreferences prefs = preferences.get();
        return new RestaurantSearchCriteria(
            prefs.getPreferredBorough(),
            prefs.getPriceLevelAsInteger(),
            prefs.getPreferredCuisines(),
            3.5 // Slightly lower threshold for personalized results
        );
    }

    /**
     * Validate taste profile data
     */
    private void validateTasteProfile(TasteProfileDto profileDto) {
        if (profileDto.getPreferredCuisines() == null || profileDto.getPreferredCuisines().isEmpty()) {
            throw new IllegalArgumentException("At least one cuisine preference is required");
        }

        if (profileDto.getPriceRange() == null || !AVAILABLE_PRICE_RANGES.contains(profileDto.getPriceRange())) {
            throw new IllegalArgumentException("Valid price range is required: " + AVAILABLE_PRICE_RANGES);
        }

        if (profileDto.getPreferredBorough() == null || !AVAILABLE_BOROUGHS.contains(profileDto.getPreferredBorough())) {
            throw new IllegalArgumentException("Valid NYC borough is required: " + AVAILABLE_BOROUGHS);
        }

        // Validate cuisines
        for (String cuisine : profileDto.getPreferredCuisines()) {
            if (!AVAILABLE_CUISINES.contains(cuisine)) {
                throw new IllegalArgumentException("Invalid cuisine: " + cuisine + ". Available: " + AVAILABLE_CUISINES);
            }
        }

        // Limit number of cuisines
        if (profileDto.getPreferredCuisines().size() > 8) {
            throw new IllegalArgumentException("Maximum 8 cuisines can be selected");
        }
    }

    // Helper classes
    public static class TasteProfileStats {
        private final List<Object[]> boroughStats;
        private final List<Object[]> priceStats;
        private final int veganVegetarianCount;

        public TasteProfileStats(List<Object[]> boroughStats, List<Object[]> priceStats, int veganVegetarianCount) {
            this.boroughStats = boroughStats;
            this.priceStats = priceStats;
            this.veganVegetarianCount = veganVegetarianCount;
        }

        public List<Object[]> getBoroughStats() { return boroughStats; }
        public List<Object[]> getPriceStats() { return priceStats; }
        public int getVeganVegetarianCount() { return veganVegetarianCount; }
    }

    public static class RestaurantSearchCriteria {
        private final String borough;
        private final Integer priceLevel;
        private final Set<String> cuisines;
        private final Double minRating;

        public RestaurantSearchCriteria(String borough, Integer priceLevel, Set<String> cuisines, Double minRating) {
            this.borough = borough;
            this.priceLevel = priceLevel;
            this.cuisines = cuisines;
            this.minRating = minRating;
        }

        public String getBorough() { return borough; }
        public Integer getPriceLevel() { return priceLevel; }
        public Set<String> getCuisines() { return cuisines; }
        public Double getMinRating() { return minRating; }
    }
} 