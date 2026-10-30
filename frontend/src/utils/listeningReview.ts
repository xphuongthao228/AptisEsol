/** Replace legacy answer summaries with a translation aligned to the quoted script. */
export function formatListeningReview(text: string): string {
  const evidenceLabel = /DẪN CHỨNG TỪ SCRIPT\s*\(TIẾNG ANH\)\s*:/i;
  const summaryLabel = /DIỄN GIẢI Ý CHÍNH BẰNG TIẾNG VIỆT\s*:/i;
  const originalLabel = /SCRIPT GỐC\s*\(TIẾNG ANH\)\s*:/i;
  const translationLabel = /BẢN DỊCH TOÀN BỘ SCRIPT\s*\(TIẾNG VIỆT\)\s*:/i;
  const evidence = evidenceLabel.exec(text);
  const summary = summaryLabel.exec(text);
  const original = originalLabel.exec(text);
  const translation = translationLabel.exec(text);

  if (!evidence || !summary || !original || !translation
    || !(evidence.index < summary.index && summary.index < original.index && original.index < translation.index)) {
    return text.replace(evidenceLabel, 'Đoạn đúng:').replace(summaryLabel, 'Dịch tiếng Việt của đoạn đúng:');
  }

  const quote = text.slice(evidence.index + evidence[0].length, summary.index).trim();
  const english = text.slice(original.index + original[0].length, translation.index).trim();
  const vietnamese = text.slice(translation.index + translation[0].length).trim();
  // Imported highlights are formatting, not part of the sentence. In particular,
  // punctuation inside style attributes must not affect sentence alignment.
  const plainText = (value: string) => value.replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&rsquo;|&#8217;/gi, '’');
  const sentences = (value: string) => plainText(value).match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const normalize = (value: string) => value.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const sourceSentences = sentences(english);
  const translatedSentences = sentences(vietnamese);
  const quotedSentences = sentences(quote);
  let translatedQuote = '';

  // Only use sentence alignment when both scripts have the same sentence count
  // and the complete quote occurs consecutively in the original.
  if (sourceSentences.length === translatedSentences.length && quotedSentences.length > 0) {
    const start = sourceSentences.findIndex((_, index) => quotedSentences.every((sentence, offset) =>
      normalize(sourceSentences[index + offset] ?? '') === normalize(sentence)));
    if (start >= 0) translatedQuote = translatedSentences.slice(start, start + quotedSentences.length).join(' ');
  }
  if (normalize(plainText(quote)) === normalize(plainText(english))) translatedQuote = vietnamese;

  return `${text.slice(0, evidence.index)}Đoạn đúng:\n${quote}\n\nDịch tiếng Việt của đoạn đúng:\n${translatedQuote || 'Chưa có bản dịch tương ứng cho đoạn đúng.'}\n\n${text.slice(original.index)}`;
}
