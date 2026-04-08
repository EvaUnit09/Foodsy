package com.foodsy.service;

import com.foodsy.domain.User;
import com.foodsy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Set;

@Service
public class AvatarService {

    private static final Logger log = LoggerFactory.getLogger(AvatarService.class);
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");

    private final S3Client s3Client;
    private final UserRepository userRepository;
    private final String bucketName;
    private final String photoBaseUrl;

    public AvatarService(
            @Value("${aws.s3.bucket-name}") String bucketName,
            @Value("${aws.s3.region}") String region,
            @Value("${aws.s3.photo-base-url}") String photoBaseUrl,
            UserRepository userRepository) {
        this.bucketName = bucketName;
        this.photoBaseUrl = photoBaseUrl;
        this.userRepository = userRepository;
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    public String uploadAvatar(User user, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPEG and PNG images are allowed");
        }

        String extension = contentType.equals("image/png") ? "png" : "jpg";
        String s3Key = "avatars/" + user.getId() + "/avatar." + extension;
        String publicUrl = photoBaseUrl + "/" + s3Key;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .contentType(contentType)
                        .cacheControl("public, max-age=86400")
                        .build(),
                RequestBody.fromBytes(file.getBytes()));

        user.setCustomAvatarUrl(publicUrl);
        userRepository.save(user);

        log.info("Uploaded avatar for user {}: {}", user.getId(), s3Key);
        return publicUrl;
    }

    public void deleteAvatar(User user) {
        String customUrl = user.getCustomAvatarUrl();
        if (customUrl == null) {
            return;
        }

        // Extract S3 key from the URL
        String prefix = photoBaseUrl + "/";
        if (customUrl.startsWith(prefix)) {
            String s3Key = customUrl.substring(prefix.length());
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .build());
                log.info("Deleted avatar from S3 for user {}: {}", user.getId(), s3Key);
            } catch (Exception e) {
                log.warn("Failed to delete avatar from S3 for user {}: {}", user.getId(), e.getMessage());
            }
        }

        user.setCustomAvatarUrl(null);
        userRepository.save(user);
    }
}
