package com.example.aptis.service;

import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.MediaFile;
import com.example.aptis.enums.MediaType;
import com.example.aptis.repository.MediaFileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BannerTargetTest {
    private CoreService service;
    private MediaFile media;

    @BeforeEach
    void setup() {
        service = mock(CoreService.class, CALLS_REAL_METHODS);
        var repository = mock(MediaFileRepository.class);
        ReflectionTestUtils.setField(service, "mediaFiles", repository);
        media = new MediaFile();
        media.setType(MediaType.IMAGE);
        doReturn(media).when(service).mediaEntity(1L);
        when(repository.save(media)).thenReturn(media);
    }

    @Test
    void savesInternalAndExternalTargetsAndAllowsClearing() {
        for (String target : new String[]{"/app/referral", "https://example.com/program"}) {
            assertEquals(target, service.updateBannerMedia(1L,
                    new CoreDtos.MediaBannerRequest(true, true, 0, target)).bannerTargetUrl());
        }
        service.updateBannerMedia(1L, new CoreDtos.MediaBannerRequest(true, false, 1, null));
        assertEquals("https://example.com/program", media.getBannerTargetUrl());
        service.updateBannerMedia(1L, new CoreDtos.MediaBannerRequest(true, true, 0, " "));
        assertNull(media.getBannerTargetUrl());
    }

    @Test
    void rejectsExecutableAndProtocolRelativeTargets() {
        for (String target : new String[]{"javascript:alert(1)", "//example.com", "/\\example.com", "program"}) {
            assertThrows(IllegalArgumentException.class, () -> service.updateBannerMedia(1L,
                    new CoreDtos.MediaBannerRequest(true, true, 0, target)));
        }
    }
}
