package com.example.aptis.repository;

import com.example.aptis.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByDeletedAtIsNullOrderByPinnedDescCreatedAtDesc();

    List<Notification> findByActiveTrueAndDeletedAtIsNullOrderByPinnedDescCreatedAtDesc();
}
