package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.MediaFile;
import com.example.aptis.service.CoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {
    private final CoreService service;
    private static final Set<String> ALLOWED_AUDIO_HOSTS = Set.of(
            "aptiskey.com",
            "www.aptiskey.com",
            "res.cloudinary.com");
    private static final HttpClient AUDIO_HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

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
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(service.mediaResource(id));
    }

    @GetMapping("/proxy-audio")
    public ResponseEntity<byte[]> proxyAudio(@RequestParam String url) throws Exception {
        URI uri = URI.create(url.trim());
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if ((!scheme.equals("http") && !scheme.equals("https")) || !ALLOWED_AUDIO_HOSTS.contains(host)) {
            return ResponseEntity.badRequest().build();
        }

        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 AptisEsolAudioProxy")
                .GET()
                .build();
        HttpResponse<byte[]> response = AUDIO_HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return ResponseEntity.status(response.statusCode()).build();
        }

        String contentType = response.headers().firstValue(HttpHeaders.CONTENT_TYPE).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(response.body());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.deleteMedia(id);
        return ApiResponse.message("Deleted", null);
    }
}
