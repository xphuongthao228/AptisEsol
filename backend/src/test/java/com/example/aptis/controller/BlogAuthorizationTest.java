package com.example.aptis.controller;

import com.example.aptis.service.BlogService;
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

@SpringJUnitConfig(BlogAuthorizationTest.Config.class)
class BlogAuthorizationTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        static final BlogService SERVICE = mock(BlogService.class);
        @Bean BlogController controller() { return new BlogController(SERVICE); }
    }
    @Autowired BlogController controller;
    @BeforeEach void setup() { reset(Config.SERVICE); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void studentCannotReadDraftsOrChangePosts() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("student", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
        var request = new BlogService.Request("Title", "Summary", "Content", null, "Reading", true);
        assertThrows(AccessDeniedException.class, () -> controller.manage());
        assertThrows(AccessDeniedException.class, () -> controller.create(request));
        assertThrows(AccessDeniedException.class, () -> controller.update(1L, request));
        assertThrows(AccessDeniedException.class, () -> controller.delete(1L));
        verifyNoInteractions(Config.SERVICE);
    }
    @Test void publicCanReadAndAdminCanManagePosts() {
        controller.list(); verify(Config.SERVICE).published();
        controller.detail(1L); verify(Config.SERVICE).detail(1L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        controller.manage(); verify(Config.SERVICE).adminList();
        var request = new BlogService.Request("Title", "Summary", "Content", null, "Reading", true);
        controller.create(request); verify(Config.SERVICE).save(null, request);
    }
}
