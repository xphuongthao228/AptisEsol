package com.example.aptis.service;

import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.*;
import com.example.aptis.enums.RoleName;
import com.example.aptis.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LeaderboardBonusTest {
    private final UserRepository users = mock(UserRepository.class);
    private final LeaderboardBonusRepository bonuses = mock(LeaderboardBonusRepository.class);
    private final LeaderboardSettingsRepository settings = mock(LeaderboardSettingsRepository.class);
    private final CoreService service = mock(CoreService.class, CALLS_REAL_METHODS);

    private User student() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Student");
        user.setEmail("student@example.com");
        Role role = new Role();
        role.setName(RoleName.STUDENT);
        user.getRoles().add(role);
        return user;
    }

    private void setup() {
        ReflectionTestUtils.setField(service, "users", users);
        ReflectionTestUtils.setField(service, "leaderboardBonuses", bonuses);
        ReflectionTestUtils.setField(service, "leaderboardSettings", settings);
        ReflectionTestUtils.setField(service, "submissions", mock(SubmissionRepository.class));
        ReflectionTestUtils.setField(service, "practiceScores", mock(PracticeScoreRepository.class));
    }

    @Test
    void bonusRanksStudentWithoutInventingSubmissionsAndUsesCurrentPeriod() {
        setup();
        LeaderboardSettings period = new LeaderboardSettings();
        period.setExamDate(LocalDate.now());
        when(settings.findTopByOrderByIdAsc()).thenReturn(Optional.of(period));
        LeaderboardBonus bonus = new LeaderboardBonus();
        bonus.setUser(student());
        bonus.setPoints(25);
        when(bonuses.findByPeriodStart(LocalDate.now())).thenReturn(List.of(bonus));
        var rows = service.leaderboard();
        assertEquals(1, rows.size());
        assertEquals(25L, rows.get(0).score());
        assertEquals(0L, rows.get(0).submissions());
        assertNull(rows.get(0).latestSubmissionAt());
        verify(bonuses).findByPeriodStart(LocalDate.now());
    }

    @Test
    void additionWithoutReasonRecordsAdminStudentAndPoints() {
        setup();
        User admin = new User();
        User student = student();
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(users.findById(1L)).thenReturn(Optional.of(student));
        service.addLeaderboardBonus("admin@example.com", 1L, new CoreDtos.LeaderboardBonusRequest(10, null));
        var capture = ArgumentCaptor.forClass(LeaderboardBonus.class);
        verify(bonuses).saveAndFlush(capture.capture());
        assertSame(admin, capture.getValue().getAdmin());
        assertSame(student, capture.getValue().getUser());
        assertEquals(10, capture.getValue().getPoints());
        assertEquals("", capture.getValue().getReason());
    }

    @Test
    void deletedStudentCannotReceivePoints() {
        setup();
        User student = student();
        student.setDeletedAt(java.time.LocalDateTime.now());
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(new User()));
        when(users.findById(1L)).thenReturn(Optional.of(student));
        assertThrows(IllegalArgumentException.class, () -> service.addLeaderboardBonus(
                "admin@example.com", 1L, new CoreDtos.LeaderboardBonusRequest(10, "Reward")));
        verify(bonuses, never()).saveAndFlush(any());
    }
}
