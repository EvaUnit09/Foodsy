package com.foodsy.service;

import com.foodsy.client.GooglePlacesClient;
import com.foodsy.domain.RestaurantCache;
import com.foodsy.repository.RestaurantCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class S3PhotoUploadJob {

    private static final Logger log = LoggerFactory.getLogger(S3PhotoUploadJob.class);
    private static final int MAX_PHOTOS_PER_RESTAURANT = 3;
    private static final long THROTTLE_DELAY_MS = 300;

    private final RestaurantCacheRepository cacheRepository;
    private final S3PhotoService s3PhotoService;
    private final GooglePlacesClient placesClient;

    public S3PhotoUploadJob(RestaurantCacheRepository cacheRepository,
                            S3PhotoService s3PhotoService,
                            GooglePlacesClient placesClient) {
        this.cacheRepository = cacheRepository;
        this.s3PhotoService = s3PhotoService;
        this.placesClient = placesClient;
    }

    /**
     * Runs at 3:30 AM daily, after the 3:00 AM trending refresh.
     * Refreshes photo references from Places API (stale refs cause 400s) then uploads to S3.
     */
    @Scheduled(cron = "0 30 3 * * *")
    public void uploadPendingPhotos() {
        log.info("S3 photo upload job starting");
        List<RestaurantCache> restaurants = cacheRepository.findAll();

        long needsSync = restaurants.stream()
                .filter(r -> r.getPhotoUrls() == null || r.getPhotoUrls().size() < MAX_PHOTOS_PER_RESTAURANT)
                .count();
        log.info("S3_SYNC_START total={} needsSync={} willSkip={}", restaurants.size(), needsSync, restaurants.size() - needsSync);

        int uploaded = 0;
        int skipped = 0;
        int failed = 0;

        for (RestaurantCache restaurant : restaurants) {
            List<String> existingUrls = restaurant.getPhotoUrls();
            if (existingUrls != null && existingUrls.size() >= MAX_PHOTOS_PER_RESTAURANT) {
                skipped++;
                continue;
            }

            String placeId = restaurant.getPlaceId();

            // Re-fetch fresh photo IDs from Places API — stored refs expire and return INVALID_ARGUMENT
            List<String> freshPhotoIds = placesClient.fetchPhotoUrls(placeId, MAX_PHOTOS_PER_RESTAURANT);
            boolean refreshedFromApi = !freshPhotoIds.isEmpty();

            if (refreshedFromApi) {
                // Persist fresh resource names so the proxy endpoint also heals
                List<String> freshRefs = freshPhotoIds.stream()
                        .map(id -> "places/" + placeId + "/photos/" + id)
                        .collect(Collectors.toCollection(ArrayList::new));
                restaurant.setPhotoReferences(freshRefs);
            } else {
                // Fall back to stored references if Places API returns nothing
                freshPhotoIds = storedPhotoIds(restaurant.getPhotoReferences());
            }

            if (freshPhotoIds.isEmpty()) {
                skipped++;
                continue;
            }

            List<String> newUrls = new ArrayList<>();
            for (int i = 0; i < freshPhotoIds.size(); i++) {
                String photoId = freshPhotoIds.get(i);

                Optional<String> url = s3PhotoService.uploadPhoto(placeId, photoId);
                if (url.isPresent()) {
                    newUrls.add(url.get());
                    uploaded++;
                } else {
                    failed++;
                }

                if (i < freshPhotoIds.size() - 1) {
                    try {
                        Thread.sleep(THROTTLE_DELAY_MS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        log.warn("S3 photo upload job interrupted");
                        return;
                    }
                }
            }

            if (!newUrls.isEmpty()) {
                restaurant.setPhotoUrls(newUrls);
                cacheRepository.save(restaurant);
            } else if (refreshedFromApi) {
                // Save refreshed photo references even if S3 upload failed
                cacheRepository.save(restaurant);
            }
        }

        double estimatedCostUsd = needsSync * 0.005 + uploaded * 0.007;
        log.info("S3_SYNC_COMPLETE uploaded={} skipped={} failed={} placeDetailsCalls={} photoMediaCalls={} estimatedCostUSD={}",
                uploaded, skipped, failed, needsSync, uploaded,
                String.format("%.4f", estimatedCostUsd));
    }

    private List<String> storedPhotoIds(List<String> photoReferences) {
        if (photoReferences == null) return List.of();
        return photoReferences.stream()
                .map(this::extractPhotoId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private String extractPhotoId(String photoReference) {
        if (photoReference == null) return null;
        if (photoReference.startsWith("places/") && photoReference.contains("/photos/")) {
            String[] parts = photoReference.split("/photos/");
            if (parts.length > 1 && !parts[1].isEmpty()) {
                return parts[1];
            }
        }
        return photoReference.isEmpty() ? null : photoReference;
    }
}
