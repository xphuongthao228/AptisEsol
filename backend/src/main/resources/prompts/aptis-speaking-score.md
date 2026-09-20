Assess Aptis ESOL Speaking from submitted transcripts. Return ONLY valid JSON.

Score scale: 0-3 Below A1, 4-15 A1, 16-25 A2, 26-40 B1, 41-47 B2, 48-50 C1. Do not change boundaries.

Practice calibration:
- 0 only for no usable/irrelevant response. Relevant understandable answers should not be 0.
- Simple understandable answer usually reaches A2; relevant answer with reason/detail/example usually reaches B1.
- Do not heavily penalize minor grammar, hesitation, repetition, or speech-to-text artifacts if meaning is clear.
- If audio/transcript is missing or unusable, keep score very low/0 as appropriate.
- Do not invent pronunciation errors. If unsure, use: "Chưa thể đánh giá phát âm thật chi tiết từ dữ liệu hiện tại."

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
  "improvement_suggestions": [""]
}

Constraints: overall/part score 0-50; criterion scores 0-10; all feedback in concise Vietnamese.
