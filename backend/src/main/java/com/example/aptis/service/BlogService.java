package com.example.aptis.service;

import com.example.aptis.entity.BlogPost;
import com.example.aptis.repository.BlogPostRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogService {
    private final BlogPostRepository posts;
    public record Request(@NotBlank @Size(max=200) String title,
                          @NotBlank @Size(max=600) String summary,
                          @NotBlank @Size(max=100000) String content,
                          @Size(max=2000) String coverUrl,
                          @NotBlank @Size(max=80) String category, boolean published) {}
    public record Preview(Long id, String title, String summary, String coverUrl, String category,
                          LocalDateTime updatedAt) {}

    public List<Preview> published() {
        return posts.findByPublishedTrueAndDeletedAtIsNullOrderByUpdatedAtDescIdDesc().stream()
                .map(p -> new Preview(p.getId(), p.getTitle(), p.getSummary(), p.getCoverUrl(), p.getCategory(), p.getUpdatedAt())).toList();
    }
    public List<BlogPost> adminList() { return posts.findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc(); }
    public BlogPost detail(Long id) {
        BlogPost post = find(id);
        if (!post.isPublished()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return post;
    }
    private BlogPost find(Long id) {
        return posts.findByIdAndDeletedAtIsNull(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    @Transactional
    public BlogPost save(Long id, Request request) {
        String cover = request.coverUrl() == null ? "" : request.coverUrl().trim();
        if (!cover.isEmpty()) {
            try {
                URI uri = URI.create(cover);
                if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null)
                    throw new IllegalArgumentException();
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Ảnh bìa phải là đường dẫn http hoặc https hợp lệ");
            }
        }
        BlogPost post = id == null ? new BlogPost() : find(id);
        post.setTitle(request.title().trim());
        post.setSummary(request.summary().trim());
        post.setContent(request.content().trim());
        post.setCategory(request.category().trim());
        post.setCoverUrl(cover.isEmpty() ? null : cover);
        post.setPublished(request.published());
        return posts.save(post);
    }
    @Transactional
    public void delete(Long id) {
        BlogPost post = find(id);
        post.setDeletedAt(LocalDateTime.now());
        posts.save(post);
    }
}
