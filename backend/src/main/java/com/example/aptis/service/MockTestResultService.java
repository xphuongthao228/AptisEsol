package com.example.aptis.service;

import com.example.aptis.dto.MockTestDtos;
import com.example.aptis.entity.MockTestResult;
import com.example.aptis.repository.MockTestResultRepository;
import com.example.aptis.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MockTestResultService {
    private final MockTestResultRepository results;
    private final UserRepository users;

    public MockTestDtos.ResultResponse save(String email, MockTestDtos.ResultRequest request) {
        var user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        MockTestResult result = new MockTestResult();
        result.setUser(user);
        result.setMockTestId(request.mockTestId());
        result.setTitle(request.title());
        result.setSkill(request.skill());
        result.setScore(Math.max(0, request.score()));
        result.setMaxScore(Math.max(1, request.maxScore()));
        result.setCefrLevel(request.cefrLevel());
        result.setResultJson(request.resultJson());
        return response(results.save(result));
    }

    public List<MockTestDtos.ResultResponse> mine(String email) {
        var user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return results.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::response).toList();
    }

    private MockTestDtos.ResultResponse response(MockTestResult result) {
        return new MockTestDtos.ResultResponse(result.getId(), result.getMockTestId(), result.getTitle(),
                result.getSkill(), result.getScore(), result.getMaxScore(), result.getCefrLevel(),
                result.getResultJson(), result.getCreatedAt());
    }
}
