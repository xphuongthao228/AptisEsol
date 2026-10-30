Assess Aptis ESOL Speaking from submitted transcripts. Return ONLY valid JSON.

Score scale: 0-3 Below A1, 4-15 A1, 16-25 A2, 26-40 B1, 41-47 B2, 48-50 C1. Do not change boundaries.

Practice calibration:
- 0 only for no usable/irrelevant response. Relevant understandable answers should not be 0.
- Use moderately strict, evidence-based scoring. A simple understandable answer is not automatically A2, and adding one reason/detail/example is not automatically B1; assess the sustained language control and task fulfilment.
- Award the highest level consistently demonstrated across the response. When genuinely borderline, select the lower level unless the higher-level descriptors are clearly supported. Do not subtract a fixed number of points or invent errors.
- Repeated grammar errors, very limited vocabulary, circular repetition and disconnected ideas must lower the relevant criteria even if the basic meaning is clear. Occasional minor slips or natural hesitation should have only a small effect.
- Do not treat likely speech-to-text artifacts as established learner errors. Infer fluency only from reliable evidence; never infer pauses, speed or pronunciation quality from punctuation alone.
- If audio/transcript is missing or unusable, keep score very low/0 as appropriate.
- Do not invent pronunciation errors. If unsure, use: "Chưa thể đánh giá phát âm thật chi tiết từ dữ liệu hiện tại."
- Check every requested question: missing answers, incomplete picture comparisons, unsupported opinions and irrelevant or memorized material reduce task response. Do not let a strong answer conceal an unanswered question.
- B1 needs connected relevant speech with adequate support and reasonable control of familiar language. B2 needs sustained development, a useful range of structures and vocabulary, and consistently clear organization with good accuracy. C1 requires precise, flexible and natural expression throughout, not an isolated advanced phrase.
- Apply expectations to the part: P1 can be concise and natural; P3/P4 need enough comparison or development to meet the actual prompts. Do not impose an essay style or an arbitrary transcript word-count penalty on speaking.
- Keep criterion scores, response scores, overall score and CEFR consistent. Feedback must explain the main evidence limiting the score and how to improve, using actual learner wording when available.

Assess each response for:
- Task response: answers the actual question, complete enough, develops ideas.
- Grammar: accuracy and range; impact on meaning.
- Vocabulary: range, appropriacy, topic words, repetition.
- Fluency/coherence: connected speech, organization, linking.
- Pronunciation: only if evidence supports it; otherwise use the note above.

Part expectations:
- P1: direct personal answer plus detail/reason/example.
- P2: describe picture and answer related questions.
- P3: describe/compare two pictures and explain opinions.
- P4: discuss topic with opinion, reasons, examples.

SUBMITTED RESPONSES:
{{ANSWERS}}

Output JSON:
{
  "overall_score": 0,
  "cefr_level": "Below A1",
  "parts": {
    "part_1_question_1": {
      "score": 0,
      "task_response": 0,
      "grammar": 0,
      "vocabulary": 0,
      "fluency_coherence": 0,
      "pronunciation": 0,
      "feedback": ""
    }
  },
  "strengths": [""],
  "weaknesses": [""],
  "improvement_suggestions": [""],
  "corrections": [
    {
      "partTitle": "Part 1 - Question 1",
      "original": "exact wrong sentence or phrase from the transcript",
      "correction": "natural corrected spoken sentence",
      "explanation": "short Vietnamese explanation"
    }
  ],
  "sample_answer": "A natural model Speaking answer covering the submitted questions."
}

Constraints:
- overall/part score 0-50; criterion scores 0-10; all feedback in concise Vietnamese.
- corrections must focus on grammar, vocabulary, word choice, sentence structure, relevance, or fluency/coherence errors.
- Do not invent pronunciation errors. Only include pronunciation advice in general tips if evidence supports it.
- corrections original must copy the transcript text exactly so the UI can highlight it.
- Include the most important 3-8 corrections. If the transcript is unusable, return an empty corrections array.
- sample_answer should be a polished sample answer, organized by Part/Question where useful, and suitable for the learner's likely level + one step higher.
