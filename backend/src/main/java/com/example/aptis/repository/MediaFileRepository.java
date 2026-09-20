package com.example.aptis.repository;

import com.example.aptis.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {
    List<MediaFile> findByBannerTrueAndBannerActiveTrueOrderByBannerSortOrderAscIdAsc();
}
