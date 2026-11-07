package com.example.aptis.controller;

import com.example.aptis.service.LearningMaterialService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringJUnitConfig(LearningMaterialAuthorizationTest.Config.class)
class LearningMaterialAuthorizationTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        static final LearningMaterialService SERVICE = mock(LearningMaterialService.class);
        @Bean LearningMaterialController controller() { return new LearningMaterialController(SERVICE); }
    }
    @Autowired LearningMaterialController controller;
    @BeforeEach void setup() { reset(Config.SERVICE); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void studentCannotChangeMaterials() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("student", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
        var request = new LearningMaterialService.Request("Test", "Reading", "", null, null, true, 0);
        assertThrows(AccessDeniedException.class, () -> controller.create(request));
        assertThrows(AccessDeniedException.class, () -> controller.update(1L, request));
        assertThrows(AccessDeniedException.class, () -> controller.delete(1L));
        verifyNoInteractions(Config.SERVICE);
    }
    @Test void adminCanSaveAndPublicListHidesUnpublishedMaterials() {
        controller.all(null);
        verify(Config.SERVICE).list(false);
        var auth = new UsernamePasswordAuthenticationToken("admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        var request = new LearningMaterialService.Request("Test", "Reading", "", null, null, true, 0);
        controller.create(request);
        controller.all(auth);
        verify(Config.SERVICE).save(null, request);
        verify(Config.SERVICE).list(true);
    }
}
