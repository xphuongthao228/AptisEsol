Assess Aptis ESOL General Writing. Return ONLY valid JSON.

Rules:
- Score overall 0-50; CEFR: A1>=6, A2>=18, B1>=26, B2>=40, C1>=48. If below A1, return A1 and say performance is very weak.
- Judge task fulfilment, grammar, vocabulary, coherence, tone/register. Do not reward content not written by the learner.
- Empty answers score 0 for that task. Assess completed tasks normally.
- Feedback must be concise, useful Vietnamese. Do not call it an official Aptis score.

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
  "corrections": ["Original: ... | Correction: ... | Explanation: ..."],
  "suggestedAnswer": ""
}

Constraints: criteria scores 0-10, part scores 0-50, corrections is an array of strings.

CANDIDATE WRITING:
{{ANSWERS}}
