package com.example.aptis.service;

import com.example.aptis.dto.VocabularyDtos.*;
import com.example.aptis.entity.VocabularyCatalog;
import com.example.aptis.repository.VocabularyCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyServiceTest {
    private final VocabularyCatalogRepository repository = mock(VocabularyCatalogRepository.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final VocabularyService service = new VocabularyService(repository, mapper);
    private final Topic topic = new Topic("education", "Education", "Learning", "education");
    private Word word(String id, String value, boolean published) {
        return new Word(id, "education", "B1", value, "", "meaning", "Example.", "Translation.", published);
    }
    private VocabularyCatalog stored(Catalog catalog, long revision) throws Exception {
        var entity = new VocabularyCatalog();entity.setId(1L);entity.setRevision(revision);
        entity.setContent(mapper.writeValueAsString(catalog));return entity;
    }
    @Test void missingCatalogReturnsDatabaseEmptyStateWithoutSampleWords() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertTrue(service.catalog(true).words().isEmpty());
        assertTrue(service.catalog(false).topics().isEmpty());
        assertEquals(0L,service.catalog(false).revision());
    }
    @Test void publicCatalogExcludesDraftsWhileAdminRetainsThem() throws Exception {
        var data = new Catalog(0L,List.of(topic),List.of(word("visible","subject",true),word("hidden","revise",false)));
        when(repository.findById(1L)).thenReturn(Optional.of(stored(data,2)));
        assertEquals(1,service.catalog(false).words().size());
        assertEquals("visible",service.catalog(false).words().get(0).id());
        assertEquals(2,service.catalog(true).words().size());assertEquals(3L,service.catalog(true).revision());
    }
    @Test void savedEmptyCatalogStaysEmptyRatherThanRestoringSeed() throws Exception {
        when(repository.findById(1L)).thenReturn(Optional.of(stored(new Catalog(0L,List.of(),List.of()),0)));
        assertTrue(service.catalog(false).words().isEmpty());assertTrue(service.catalog(true).topics().isEmpty());
    }
    @Test void preventsDeletingTopicStillReferencedByWord() {
        var request = new Catalog(0L,List.of(),List.of(word("one","subject",true)));
        assertThrows(IllegalArgumentException.class,()->service.save(request));verify(repository,never()).saveAndFlush(any());
    }
    @Test void rejectsDuplicateWordsAndTopics() {
        assertThrows(IllegalArgumentException.class,()->service.save(new Catalog(0L,List.of(topic),List.of(word("one","subject",true),word("two"," SUBJECT ",true)))));
        assertThrows(IllegalArgumentException.class,()->service.save(new Catalog(0L,List.of(topic,topic),List.of())));
    }
    @Test void staleRevisionCannotOverwriteNewerContent() throws Exception {
        var request = new Catalog(1L,List.of(topic),List.of(word("one","subject",true)));
        when(repository.findById(1L)).thenReturn(Optional.of(stored(request,1)));
        var error=assertThrows(ResponseStatusException.class,()->service.save(request));
        assertEquals(409,error.getStatusCode().value());verify(repository,never()).saveAndFlush(any());
    }
    @Test void saveRoundTripKeepsStableIdsAndUpdatesRevision() throws Exception {
        var request=new Catalog(1L,List.of(topic),List.of(word("subject","renamed subject",true)));
        var entity=stored(request,0);when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.saveAndFlush(any())).thenAnswer(call->{VocabularyCatalog row=call.getArgument(0);row.setRevision(1L);return row;});
        Catalog response=service.save(request);assertEquals(2L,response.revision());assertEquals("subject",response.words().get(0).id());
        assertEquals("renamed subject",service.catalog(false).words().get(0).word());
    }
    @Test void beanValidationRejectsInvalidLevelAndBlankMeaning() {
        var invalid=new Word("one","education","A1","word",""," ","Example","Translation",true);
        try(var factory=Validation.buildDefaultValidatorFactory()) {assertFalse(factory.getValidator().validate(new Catalog(0L,List.of(topic),List.of(invalid))).isEmpty());}
    }
}
