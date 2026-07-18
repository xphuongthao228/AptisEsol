package com.example.aptis.service;

import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.Notification;
import com.example.aptis.enums.NotificationAudience;
import com.example.aptis.enums.NotificationLevel;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;

    @Transactional(readOnly = true)
    public List<CoreDtos.NotificationResponse> all() {
        return notifications.findByDeletedAtIsNullOrderByPinnedDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CoreDtos.NotificationResponse> active() {
        return notifications.findByActiveTrueAndDeletedAtIsNullOrderByPinnedDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CoreDtos.NotificationResponse create(CoreDtos.NotificationRequest request) {
        Notification notification = new Notification();
        apply(notification, request);
        return toResponse(notifications.save(notification));
    }

    @Transactional
    public CoreDtos.NotificationResponse update(Long id, CoreDtos.NotificationRequest request) {
        Notification notification = notifications.findById(id)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        apply(notification, request);
        return toResponse(notifications.save(notification));
    }

    @Transactional
    public void delete(Long id) {
        Notification notification = notifications.findById(id)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setDeletedAt(LocalDateTime.now());
        notifications.save(notification);
    }

    private void apply(Notification notification, CoreDtos.NotificationRequest request) {
        notification.setTitle(request.title().trim());
        notification.setMessage(request.message().trim());
        notification.setAudience(request.audience() == null ? NotificationAudience.ALL : request.audience());
        notification.setLevel(request.level() == null ? NotificationLevel.INFO : request.level());
        notification.setActive(request.active() == null || request.active());
        notification.setPinned(Boolean.TRUE.equals(request.pinned()));
    }

    private CoreDtos.NotificationResponse toResponse(Notification notification) {
        return new CoreDtos.NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getAudience(),
                notification.getLevel(),
                notification.isActive(),
                notification.isPinned(),
                notification.getCreatedAt(),
                notification.getUpdatedAt()
        );
    }
}
