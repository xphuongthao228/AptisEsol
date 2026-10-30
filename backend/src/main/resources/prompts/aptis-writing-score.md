Assess Aptis ESOL General Writing. Return ONLY valid JSON.

Rules:
- Score overall 0-50; CEFR: A1>=6, A2>=18, B1>=26, B2>=40, C1>=48. If below A1, return A1 and say performance is very weak.
- Judge task fulfilment, grammar, vocabulary, coherence, tone/register. Do not reward content not written by the learner.
- Empty answers score 0 for that task. Assess completed tasks normally.
- Feedback must be concise, useful Vietnamese. Do not call it an official Aptis score.

Scoring calibration (moderately strict):
- Award the highest level that is consistently demonstrated, not the level suggested by an isolated good phrase. If performance is borderline between two levels, use the lower level unless the higher-level descriptors are clearly met.
- Do not award extra points for effort, length alone, memorized openings, or sophisticated words used inaccurately. Do not subtract a fixed number of points from an otherwise justified score.
- Check every requested sub-question and both emails in T4. Missing content, off-topic passages, undeveloped reasons and inappropriate register must reduce the relevant task score and be reflected in the overall result.
- Repeated grammar, spelling, punctuation and word-choice errors indicate weak control even when the meaning remains understandable. Distinguish recurring errors from occasional slips; do not count the same fault repeatedly within one criterion.
- B1 requires connected relevant ideas with sufficient support for the task. B2 requires sustained development, organization, grammatical control and suitable register across the longer tasks; a few complex sentences do not suffice. C1 requires consistently precise, flexible and natural language with only occasional minor slips.
- Judge answer length against the actual task instructions. T1 legitimately uses short answers; do not penalize it for lacking an essay structure. For longer tasks, brevity matters when it leaves required content or development missing, not as an automatic word-count penalty.
- Keep criteria, part scores, overall score and CEFR consistent. Give concise Vietnamese feedback identifying the main evidence that limits the score, with exact learner examples where possible. Never invent errors to justify a stricter mark.

Task focus:
- T1: five short answers; relevance and intelligibility.
- T2: short information response; relevance, basic grammar/vocab, spelling, punctuation.
- T3: three forum/social responses; relevance, cohesion, language appropriacy.
- T4: informal + formal emails; organization, development, register and tone.

Level guide:
- A1: very basic phrases; frequent errors; limited completion.
- A2: simple familiar ideas; understandable; basic linking.
- B1: clear relevant ideas; reasons/examples; errors rarely block meaning.
- B2: well developed, organized, accurate range; register controlled.
- C1: precise, flexible, coherent, natural and detailed.

JSON schema:
{
  "overallScore": 0,
  "cefrLevel": "A1",
  "summary": "",
  "criteria": [
    {"name":"Task achievement","score":0,"feedback":""},
    {"name":"Grammar","score":0,"feedback":""},
    {"name":"Vocabulary","score":0,"feedback":""},
    {"name":"Coherence","score":0,"feedback":""},
    {"name":"Tone/register","score":0,"feedback":""}
  ],
  "parts": [{"title":"","score":0,"feedback":""}],
  "corrections": [
    {
      "partTitle": "Writing Part 2",
      "original": "exact wrong sentence copied from the learner answer",
      "correction": "natural corrected sentence",
      "explanation": "short Vietnamese explanation"
    }
  ],
  "suggestedAnswer": ""
}

Constraints:
- criteria scores 0-10, part scores 0-50.
- corrections must be an array of objects.
- Each correction must focus on one complete sentence or short phrase that is actually wrong.
- The original field must copy the learner's wrong text exactly so the UI can highlight it.
- Include the most important 3-10 corrections only.
- If there are no clear sentence-level errors, return an empty corrections array.

CANDIDATE WRITING:
{{ANSWERS}}
