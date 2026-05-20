package com.foodsy.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PlacesApiCallTracker {

    private final AtomicInteger photoDetailsCalls = new AtomicInteger(0);
    private final AtomicInteger photoMediaCalls = new AtomicInteger(0);
    private final AtomicInteger proxyHits = new AtomicInteger(0);
    private final AtomicInteger s3SyncDetailsCalls = new AtomicInteger(0);
    private final AtomicInteger s3SyncMediaCalls = new AtomicInteger(0);

    public void incrementPhotoDetailsCalls() { photoDetailsCalls.incrementAndGet(); }
    public void incrementPhotoMediaCalls() { photoMediaCalls.incrementAndGet(); }
    public void incrementProxyHits() { proxyHits.incrementAndGet(); }
    public void incrementS3SyncDetailsCalls() { s3SyncDetailsCalls.incrementAndGet(); }
    public void incrementS3SyncMediaCalls() { s3SyncMediaCalls.incrementAndGet(); }

    public Map<String, Integer> getSnapshot() {
        return Map.of(
            "photoDetailsCalls", photoDetailsCalls.get(),
            "photoMediaCalls", photoMediaCalls.get(),
            "proxyHits", proxyHits.get(),
            "s3SyncDetailsCalls", s3SyncDetailsCalls.get(),
            "s3SyncMediaCalls", s3SyncMediaCalls.get()
        );
    }

    public void reset() {
        photoDetailsCalls.set(0);
        photoMediaCalls.set(0);
        proxyHits.set(0);
        s3SyncDetailsCalls.set(0);
        s3SyncMediaCalls.set(0);
    }
}
