import { useEffect, useState } from 'react';
import { api, unwrap } from '../api/client';

export type ListeningReview = {
  scriptVi: string;
  answers: Array<{ index: number; answer: string; en: string; vi: string; reasonVi?: string }>;
};

const requests = new Map<string, Promise<ListeningReview>>();

export function useListeningReview(questionId: number | undefined, script: string, enabled: boolean) {
  const key = `evidence-v2:${questionId}:${script}`;
  const [state, setState] = useState<{ key: string; data?: ListeningReview; error?: boolean }>({ key: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !questionId || !script.trim()) return;
    let active = true;
    setState({ key });
    let request = requests.get(key);
    if (!request) {
      request = unwrap<ListeningReview>(api.post(`/questions/${questionId}/listening-review`, {}, { timeout: 120_000 }));
      if (requests.size >= 128) requests.delete(requests.keys().next().value!);
      requests.set(key, request);
      request.catch(() => { if (requests.get(key) === request) requests.delete(key); });
    }
    request.then((data) => { if (active) setState({ key, data }); })
      .catch(() => { if (active) setState({ key, error: true }); });
    return () => { active = false; };
  }, [key, questionId, script, enabled, attempt]);
  const current = enabled && state.key === key ? state : undefined;
  return {
    data: current?.data,
    error: Boolean(current?.error),
    loading: enabled && Boolean(questionId && script.trim()) && !current?.data && !current?.error,
    retry: () => setAttempt((value) => value + 1)
  };
}
