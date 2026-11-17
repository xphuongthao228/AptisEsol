package com.example.aptis.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public final class VocabularyDtos {
    private VocabularyDtos() {}
    public record Topic(
        @NotBlank @Size(max = 80) @Pattern(regexp = "[a-zA-Z0-9_-]+") String id,
        @NotBlank @Size(max = 120) String title,
        @NotNull @Size(max = 500) String description,
        @NotBlank @Pattern(regexp = "education|work|environment|technology|book") String icon) {}
    public record Word(
        @NotBlank @Size(max = 120) String id,
        @NotBlank @Size(max = 80) String topic,
        @NotBlank @Pattern(regexp = "B1|B2|C1") String level,
        @NotBlank @Size(max = 160) String word,
        @NotNull @Size(max = 200) String ipa,
        @NotBlank @Size(max = 500) String meaning,
        @NotBlank @Size(max = 2000) String example,
        @NotBlank @Size(max = 2000) String translation,
        boolean published) {}
    public record Catalog(
        @NotNull @PositiveOrZero Long revision,
        @NotNull @Size(max = 100) List<@NotNull @Valid Topic> topics,
        @NotNull @Size(max = 10000) List<@NotNull @Valid Word> words) {}
}
