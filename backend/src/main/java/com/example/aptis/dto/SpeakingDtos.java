package com.example.aptis.dto;

import java.math.BigDecimal;
import java.util.List;

public class SpeakingDtos {
    public record SubmitResponse(
            Long attemptId,
            String transcript,
            PartResult partResult,
            Result result) {
    }

    public record Result(
            Integer part1,
            Integer part2,
            Integer part3,
            Integer part4,
            BigDecimal overallScore,
            String cefr,
            String feedback) {
    }

    public record PartResult(
            String part,
            Scores scores,
            int partScore,
            List<Mistake> mistakes,
            List<String> strengths,
            List<String> improvements,
            String feedback) {
    }

    public record Scores(
            int grammar,
            int vocabulary,
            int fluency,
            int pronunciation,
            int taskResponse,
            int pictureDescription,
            int vocabularyRange,
            int organization,
            int comparisonSkill,
            int ideasDevelopment,
            int opinionDevelopment,
            int examples,
            int grammarComplexity) {
    }

    public record Mistake(String original, String correction) {
    }
}
