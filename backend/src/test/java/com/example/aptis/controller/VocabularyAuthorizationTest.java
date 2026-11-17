package com.example.aptis.controller;

import com.example.aptis.dto.VocabularyDtos.Catalog;
import com.example.aptis.service.VocabularyService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyAuthorizationTest {
    @Configuration
    @EnableMethodSecurity
    static class Config {
        @Bean VocabularyService vocabularyService() { return mock(VocabularyService.class); }
        @Bean VocabularyController vocabularyController(VocabularyService service) { return new VocabularyController(service); }
    }
    private AnnotationConfigApplicationContext context;
    private VocabularyController controller;
    private VocabularyService service;
    private final Catalog catalog = new Catalog(0L,List.of(),List.of());
    @BeforeEach void setup() {
        context = new AnnotationConfigApplicationContext(Config.class);
        controller = context.getBean(VocabularyController.class);service = context.getBean(VocabularyService.class);
        when(service.catalog(false)).thenReturn(catalog);when(service.catalog(true)).thenReturn(catalog);when(service.save(catalog)).thenReturn(catalog);
    }
    @AfterEach void cleanup() {SecurityContextHolder.clearContext();context.close();}
    void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test",null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));
    }
    @Test void anonymousCanReadPublishedVocabulary() {
        assertNotNull(controller.published());verify(service).catalog(false);verify(service,never()).catalog(true);
    }
    @Test void studentCannotReadDraftsOrSaveCatalog() {
        login("STUDENT");assertThrows(AccessDeniedException.class,()->controller.admin());assertThrows(AccessDeniedException.class,()->controller.save(catalog));verifyNoInteractions(service);
    }
    @Test void adminCanReadAndSaveCatalog() {
        login("ADMIN");assertNotNull(controller.admin());assertNotNull(controller.save(catalog));verify(service).catalog(true);verify(service).save(catalog);
    }
}
