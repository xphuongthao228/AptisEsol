export const materialCategories = ['Grammar', 'Vocabulary', 'Reading', 'Listening', 'Writing', 'Speaking', 'Phương pháp học', 'Kinh nghiệm ôn thi'] as const;
export interface LearningMaterial {
  id: number;
  title: string;
  category: string;
  description: string;
  coverUrl: string | null;
  resourceUrl: string | null;
  visible: boolean;
  sortOrder: number;
  content?: string | null;
}
export const materialColors: Record<string, [string, string]> = {
  Grammar: ['#ffe6e8', '#be3449'], Vocabulary: ['#fff4ce', '#ab7218'],
  Reading: ['#dff4ff', '#2180ac'], Listening: ['#e7f8dc', '#448b36'],
  Writing: ['#eee5ff', '#7950ad'], Speaking: ['#ffe9db', '#b76739']
};
export const validMaterialUrl = (url: string) => !url || (!/[\\\s]/.test(url) && /^(https?:\/\/[^/]+|\/(?!\/))/i.test(url));

export function mediaUrl(id: number) {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
  return `${base.replace(/\/$/, '')}/media/${id}`;
}

// Word's Symbol/Wingdings bullets use private-use glyphs that web fonts cannot render.
export function normalizeMaterialContent(value: string) {
  return value.replace(/\r\n?/g, '\n')
    .replace(/^([ \t]*)[\uF0B7\uF0A7\uF0D8\uF076\uF0FC\u25A1][ \t]*/gm, '$1• ');
}
