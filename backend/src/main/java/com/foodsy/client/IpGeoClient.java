package com.foodsy.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Optional;

/**
 * Lightweight IP geolocation client using ipapi.co (no API key required for basic usage).
 */
@Component
public class IpGeoClient {
    private static final Logger logger = LoggerFactory.getLogger(IpGeoClient.class);

    private final RestClient restClient;

    public IpGeoClient() {
        this.restClient = RestClient.builder()
                .baseUrl("https://ipapi.co")
                .build();
    }

    /**
     * Resolve latitude/longitude for the given client IP. If ip is null or blank,
     * uses the caller IP (ipapi.co/json).
     */
    public Optional<double[]> lookup(String ip) {
        try {
            String path = (ip == null || ip.isBlank()) ? "/json/" : "/" + ip + "/json/";
            Map<String, Object> response = restClient.get()
                    .uri(path)
                    .retrieve()
                    .body(Map.class);
            if (response == null) return Optional.empty();
            Object latObj = response.get("latitude");
            Object lonObj = response.get("longitude");
            if (latObj instanceof Number && lonObj instanceof Number) {
                double lat = ((Number) latObj).doubleValue();
                double lng = ((Number) lonObj).doubleValue();
                return Optional.of(new double[]{lat, lng});
            }
            // Some variants return strings
            if (latObj instanceof String && lonObj instanceof String) {
                try {
                    double lat = Double.parseDouble((String) latObj);
                    double lng = Double.parseDouble((String) lonObj);
                    return Optional.of(new double[]{lat, lng});
                } catch (NumberFormatException ignored) {
                }
            }
            return Optional.empty();
        } catch (Exception e) {
            logger.error("IpGeoClient lookup error: {}", e.getMessage());
            return Optional.empty();
        }
    }
}


