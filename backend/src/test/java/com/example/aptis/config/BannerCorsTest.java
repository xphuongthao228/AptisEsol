package com.example.aptis.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.DefaultCorsProcessor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BannerCorsTest {
    @Test
    void allowsBannerPatchPreflightFromFrontend() throws Exception {
        var security = mock(SecurityConfig.class, CALLS_REAL_METHODS);
        ReflectionTestUtils.setField(security, "cors", "http://localhost:5173");
        var request = new MockHttpServletRequest("OPTIONS", "/api/media/1/banner");
        request.addHeader("Origin", "http://localhost:5173");
        request.addHeader("Access-Control-Request-Method", "PATCH");
        request.addHeader("Access-Control-Request-Headers", "authorization,content-type");
        var response = new MockHttpServletResponse();
        var config = security.corsConfigurationSource().getCorsConfiguration(request);
        assertTrue(new DefaultCorsProcessor().processRequest(config, request, response));
        assertEquals("http://localhost:5173", response.getHeader("Access-Control-Allow-Origin"));
        assertTrue(response.getHeader("Access-Control-Allow-Methods").contains("PATCH"));
    }
}
