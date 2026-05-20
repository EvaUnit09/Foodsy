package com.foodsy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.Optional;

@Service
public class S3PhotoService {

    private static final Logger log = LoggerFactory.getLogger(S3PhotoService.class);

    private final S3Client s3Client;
    private final RestTemplate restTemplate;
    private final String bucketName;
    private final String photoBaseUrl;

    @Value("${google.places.api.key}")
    private String googleApiKey;

    private final PlacesApiCallTracker tracker;

    public S3PhotoService(
            @Value("${aws.s3.bucket-name}") String bucketName,
            @Value("${aws.s3.region}") String region,
            @Value("${aws.s3.photo-base-url}") String photoBaseUrl,
            PlacesApiCallTracker tracker) {
        this.bucketName = bucketName;
        this.photoBaseUrl = photoBaseUrl;
        this.tracker = tracker;
        this.restTemplate = new RestTemplate();
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    /**
     * Uploads a photo to S3 if not already present, returning its public URL.
     * Idempotent: uses HeadObject to skip already-uploaded photos.
     *
     * @param placeId Google Places place ID
     * @param photoId photo ID extracted from photo reference
     * @return Optional containing the S3 URL, or empty on failure
     */
    public Optional<String> uploadPhoto(String placeId, String photoId) {
        String s3Key = "restaurants/" + placeId + "/" + photoId + ".jpg";
        String publicUrl = photoBaseUrl + "/" + s3Key;

        // Idempotency check — skip if already uploaded with correct content type
        try {
            var head = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build());
            String existingContentType = head.contentType();
            if (existingContentType != null && existingContentType.startsWith("image/")) {
                log.debug("S3 photo already exists, skipping: {}", s3Key);
                return Optional.of(publicUrl);
            }
            // Object exists but has wrong content type (e.g. JSON from skipHttpRedirect) — re-upload
            log.info("S3 photo has wrong content type '{}', re-uploading: {}", existingContentType, s3Key);
        } catch (NoSuchKeyException ignored) {
            // Not yet uploaded — proceed
        } catch (Exception e) {
            log.warn("S3 HeadObject check failed for key {}: {}", s3Key, e.getMessage());
            return Optional.empty();
        }

        // Download from Google Places API
        log.info("PLACES_API type=photo_media placeId={} photoId={} caller=S3Sync", placeId, photoId);
        tracker.incrementS3SyncMediaCalls();
        tracker.incrementPhotoMediaCalls();
        String googleUrl = "https://places.googleapis.com/v1/places/" + placeId
                + "/photos/" + photoId + "/media?maxHeightPx=800&maxWidthPx=800";
        byte[] photoBytes;
        String contentType;
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Goog-Api-Key", googleApiKey);
            org.springframework.http.HttpEntity<Void> entity =
                    new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    googleUrl,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("Google Places photo download failed for {}/{}: status {}",
                        placeId, photoId, response.getStatusCode());
                return Optional.empty();
            }
            photoBytes = response.getBody();
            org.springframework.http.MediaType mediaType = response.getHeaders().getContentType();
            contentType = (mediaType != null) ? mediaType.toString() : "image/jpeg";
        } catch (Exception e) {
            log.warn("Failed to download photo from Google for {}/{}: {}", placeId, photoId, e.getMessage());
            return Optional.empty();
        }

        // Upload to S3
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Key)
                            .contentType(contentType)
                            .cacheControl("public, max-age=31536000, immutable")
                            .build(),
                    RequestBody.fromBytes(photoBytes));
            log.debug("Uploaded photo to S3: {}", s3Key);
            return Optional.of(publicUrl);
        } catch (Exception e) {
            log.warn("Failed to upload photo to S3 for key {}: {}", s3Key, e.getMessage());
            return Optional.empty();
        }
    }
}
