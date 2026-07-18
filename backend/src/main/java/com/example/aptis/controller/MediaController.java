package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.MediaFile;
import com.example.aptis.service.CoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {
    private final CoreService service;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.MediaResponse> upload(Authentication auth, @RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.ok(service.upload(auth.getName(), file));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CoreDtos.MediaResponse>> all() {
        return ApiResponse.ok(service.mediaList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> get(@PathVariable Long id) throws Exception {
        MediaFile media = service.mediaEntity(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, media.getContentType())
                .body(service.mediaResource(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.deleteMedia(id);
        return ApiResponse.message("Deleted", null);
    }
}
