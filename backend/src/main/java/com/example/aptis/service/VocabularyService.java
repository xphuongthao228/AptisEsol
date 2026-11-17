package com.example.aptis.service;

import com.example.aptis.dto.VocabularyDtos.*;
import com.example.aptis.entity.VocabularyCatalog;
import com.example.aptis.repository.VocabularyCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashSet;
import java.util.Locale;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VocabularyService {
    private final VocabularyCatalogRepository repository;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public Catalog catalog(boolean admin) {
        var stored = repository.findById(1L);
        Catalog catalog = stored.map(row -> decode(row.getContent(), row.getRevision() + 1)).orElseGet(() -> new Catalog(0L, List.of(), List.of()));
        if (admin) return catalog;
        return new Catalog(catalog.revision(), catalog.topics(),
                catalog.words().stream().filter(Word::published).toList());
    }

    @Transactional
    public Catalog save(Catalog request) {
        validate(request);
        var current = repository.findById(1L);
        long revision = current.map(row -> row.getRevision() + 1).orElse(0L);
        if (request.revision() != revision) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dữ liệu đã được admin khác cập nhật. Hãy tải lại trước khi lưu.");
        }
        VocabularyCatalog row = current.orElseGet(() -> {
            var created = new VocabularyCatalog();
            created.setId(1L);
            return created;
        });
        try {
            row.setContent(mapper.writeValueAsString(request));
        } catch (IOException e) {
            throw new IllegalStateException("Không thể lưu từ vựng", e);
        }
        row = repository.saveAndFlush(row);
        return new Catalog(row.getRevision() + 1, request.topics(), request.words());
    }

    static void validate(Catalog request) {
        Set<String> topics = new HashSet<>();
        Set<String> titles = new HashSet<>();
        for (Topic topic : request.topics()) {
            if (!topics.add(topic.id()) || !titles.add(topic.title().strip().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Chủ đề bị trùng mã hoặc tên");
            }
        }
        Set<String> ids = new HashSet<>();
        Set<String> words = new HashSet<>();
        for (Word word : request.words()) {
            if (!topics.contains(word.topic())) throw new IllegalArgumentException("Từ vựng phải thuộc một chủ đề tồn tại");
            if (!ids.add(word.id()) || !words.add(word.topic() + ":" + word.level() + ":" + word.word().strip().toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Từ vựng bị trùng mã hoặc trùng trong cùng chủ đề và cấp độ");
            }
        }
    }

    private Catalog decode(String content, Long revision) {
        try {
            Catalog data = mapper.readValue(content, Catalog.class);
            return new Catalog(revision, data.topics(), data.words());
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc dữ liệu từ vựng", e);
        }
    }
}
