package com.example.aptis.service;

import com.example.aptis.dto.AiDtos;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AiScoringServiceTest {
    @Test
    void unavailableTranscriptionProducesZeroAptisScore() {
        AiScoringService service = new AiScoringService(new ObjectMapper(), new DefaultResourceLoader());
        var part = new AiDtos.SpeakingPartRequest("Part 1", "Tell me about yourself",
                "[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]", "answer.webm", "audio/webm", 1000L);
        var result = service.scoreSpeaking(new AiDtos.SpeakingScoreRequest(List.of(part)));
        assertEquals(0, result.overallScore());
        assertEquals("Below A1", result.cefrLevel());
        assertEquals(0, result.parts().get(0).score());
    }

    @Test
    void missingAudioProducesZeroAptisScore() {
        AiScoringService service = new AiScoringService(new ObjectMapper(), new DefaultResourceLoader());
        var part = new AiDtos.SpeakingPartRequest("Part 1", "Tell me about yourself",
                "", "", "", 0L);
        var result = service.scoreSpeaking(new AiDtos.SpeakingScoreRequest(List.of(part)));
        assertEquals(0, result.overallScore());
        assertEquals("Below A1", result.cefrLevel());
        assertTrue(result.summary().contains("0/50"));
    }
}
