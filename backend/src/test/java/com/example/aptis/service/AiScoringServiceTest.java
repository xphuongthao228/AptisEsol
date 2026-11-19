package com.example.aptis.service;

import com.example.aptis.dto.AiDtos;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.mock.web.MockMultipartFile;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AiScoringServiceTest {
    @Test
    void namedAudioIsNotReusedForAnUnansweredQuestion() {
        AiScoringService service = new AiScoringService(new ObjectMapper(), new DefaultResourceLoader());
        var unanswered = new AiDtos.SpeakingPartRequest("Question 1", "First prompt",
                "[NO_AUDIO_FILE_SUBMITTED]", "", "", 0L);
        var answered = new AiDtos.SpeakingPartRequest("Question 2", "Second prompt",
                "", "answer.webm", "audio/webm", 1L);
        var audio = new MockMultipartFile("files", "answer.webm", "audio/webm", new byte[]{1});

        var result = service.scoreSpeaking(new AiDtos.SpeakingScoreRequest(List.of(unanswered, answered)), List.of(audio));

        assertTrue(result.parts().get(0).feedback().contains("chưa có file ghi âm"));
        assertTrue(result.parts().get(1).feedback().contains("Không nhận dạng được"));
    }

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
