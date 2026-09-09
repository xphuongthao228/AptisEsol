package com.example.aptis.service;

import com.example.aptis.dto.AiDtos;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AiScoringServiceTest {
    @Test
    void unavailableTranscriptionMustNotProduceALowScore() {
        AiScoringService service = new AiScoringService(new ObjectMapper(), new DefaultResourceLoader());
        var part = new AiDtos.SpeakingPartRequest("Part 1", "Tell me about yourself",
                "[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]", "answer.webm", "audio/webm", 1000L);
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.scoreSpeaking(new AiDtos.SpeakingScoreRequest(List.of(part))));
        assertTrue(error.getMessage().contains("bản ghi âm"));
    }
}
