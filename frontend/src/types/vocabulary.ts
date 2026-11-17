export type VocabularyLevel = 'B1' | 'B2' | 'C1';
export type VocabularyTopic = { id: string; title: string; description: string; icon: 'education' | 'work' | 'environment' | 'technology' | 'book' };
export type VocabularyWord = { id: string; topic: string; level: VocabularyLevel; word: string; ipa: string; meaning: string; example: string; translation: string; published: boolean };
export type VocabularyCatalog = { revision: number; topics: VocabularyTopic[]; words: VocabularyWord[] };
