package com.example.aptis.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ActiveVisitorService {
    private static final Duration ONLINE_WINDOW = Duration.ofMinutes(2);

    private final ConcurrentMap<String, Instant> lastSeenByVisitor = new ConcurrentHashMap<>();

    public String touch(String visitorId) {
        Instant now = Instant.now();
        cleanup(now.minus(ONLINE_WINDOW));
        String normalizedId = visitorId == null || visitorId.isBlank() ? UUID.randomUUID().toString() : visitorId;
        lastSeenByVisitor.put(normalizedId, now);
        return normalizedId;
    }

    public long onlineCount() {
        Instant cutoff = Instant.now().minus(ONLINE_WINDOW);
        cleanup(cutoff);
        return lastSeenByVisitor.values().stream().filter(lastSeen -> lastSeen.isAfter(cutoff)).count();
    }

    private void cleanup(Instant cutoff) {
        lastSeenByVisitor.entrySet().removeIf(entry -> entry.getValue().isBefore(cutoff));
    }
}
