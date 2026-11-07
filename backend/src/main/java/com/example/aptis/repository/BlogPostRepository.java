package com.example.aptis.repository;

import com.example.aptis.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    List<BlogPost> findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc();
    List<BlogPost> findByPublishedTrueAndDeletedAtIsNullOrderByUpdatedAtDescIdDesc();
    Optional<BlogPost> findByIdAndDeletedAtIsNull(Long id);
}
