package com.foodsy.service;

import com.foodsy.domain.RestaurantCache;
import com.foodsy.repository.RestaurantCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class S3PhotoUploadJob {

    private static final Logger log = LoggerFactory.getLogger(S3PhotoUploadJob.class);
    private static final int MAX_PHOTOS_PER_RESTAURANT = 3;
    private static final long THROTTLE_DELAY_MS = 300;

    private final RestaurantCacheRepository cacheRepository;
    private final S3PhotoService s3PhotoService;

    public S3PhotoUploadJob(RestaurantCacheRepository cacheRepository, S3PhotoService s3PhotoService) {
        this.cacheRepository = cacheRepository;
        this.s3PhotoService = s3PhotoService;
    }

    /**
     * Runs at 3:30 AM daily, after the 3:00 AM trending refresh.
     * Uploads restaurant photos to S3 and stores the resulting URLs in the cache.
     */
    @Scheduled(cron = "0 30 3 * * *")
    public void uploadPendingPhotos() {
        log.info("S3 photo upload job starting");
        List<RestaurantCache> restaurants = cacheRepository.findAll();

        int uploaded = 0;
        int skipped = 0;
        int failed = 0;

        for (RestaurantCache restaurant : restaurants) {
            List<String> existingUrls = restaurant.getPhotoUrls();
            if (existingUrls != null && existingUrls.size() >= MAX_PHOTOS_PER_RESTAURANT) {
                skipped++;
                continue;
            }

            List<String> photoRefs = restaurant.getPhotoReferences();
            if (photoRefs == null || photoRefs.isEmpty()) {
                skipped++;
                continue;
            }

            List<String> newUrls = new ArrayList<>();
            String placeId = restaurant.getPlaceId();

            for (int i = 0; i < Math.min(photoRefs.size(), MAX_PHOTOS_PER_RESTAURANT); i++) {
                String ref = photoRefs.get(i);
                String photoId = extractPhotoId(ref);
                if (photoId == null) {
                    failed++;
                    continue;
                }

                Optional<String> url = s3PhotoService.uploadPhoto(placeId, photoId);
                if (url.isPresent()) {
                    newUrls.add(url.get());
                    uploaded++;
                } else {
                    failed++;
                }

                if (i < Math.min(photoRefs.size(), MAX_PHOTOS_PER_RESTAURANT) - 1) {
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
            }
        }

        log.info("S3 photo upload job complete — uploaded: {}, skipped: {}, failed: {}",
                uploaded, skipped, failed);
    }

    private String extractPhotoId(String photoReference) {
        if (photoReference == null) return null;
        // Format: "places/{placeId}/photos/{photoId}"
        if (photoReference.startsWith("places/") && photoReference.contains("/photos/")) {
            String[] parts = photoReference.split("/photos/");
            if (parts.length > 1 && !parts[1].isEmpty()) {
                return parts[1];
            }
        }
        // Fall back to using the reference as-is if it doesn't match expected format
        return photoReference.isEmpty() ? null : photoReference;
    }
}
