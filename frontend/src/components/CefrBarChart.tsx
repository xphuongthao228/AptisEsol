import type { AptisBand } from '../utils/aptisScoring';

export function CefrBarChart({ items }: { items: { label: string; band: AptisBand | null }[] }) {
  const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];
  const left = 40;
  const top = 42;
  const bottom = 242;
  const step = 40;
  const columnWidth = 72;
  return (
    <svg viewBox="0 0 420 302" className="block h-auto w-full" role="img" aria-label="Hồ sơ CEFR: biểu đồ cột Listening, Reading, Speaking, Writing và Overall">
      <title>CEFR skill profile</title>
      <desc>{items.map(item => `${item.label}: ${item.band ?? 'Chưa có kết quả'}`).join('; ')}</desc>
      <text x="0" y="18" fill="#25236b" fontSize="15" fontWeight="700">CEFR grade</text>
      {levels.map((level, index) => {
        const y = bottom - index * step;
        return <g key={level}>
          <line x1={left} x2="408" y1={y} y2={y} stroke={index === 0 ? '#25236b' : '#cbd5e1'} strokeWidth={index === 0 ? 1.5 : 1} />
          <text x="0" y={y + 4} fill="#475569" fontSize="13">{level}</text>
        </g>;
      })}
      {items.map((item, index) => {
        const level = item.band ? levels.indexOf(item.band) : 0;
        const height = Math.max(0, level) * step;
        const x = left + index * columnWidth + 18;
        return <g key={item.label}>
          <title>{item.label}: {item.band ?? 'Chưa có kết quả'}</title>
          {height > 0 && <rect x={x} y={bottom - height} width="34" height={height} fill="#e50935" />}
          <text x={x + 17} y={Math.max(top - 10, bottom - height - 9)} textAnchor="middle" fill="#25236b" fontSize="14" fontWeight="700">{item.band ?? '--'}</text>
          <text x={x + 17} y="263" textAnchor="middle" fill="#475569" fontSize="11">
            {item.label === 'Overall' ? <><tspan x={x + 17}>Overall</tspan><tspan x={x + 17} dy="15">CEFR grade</tspan></> : item.label}
          </text>
        </g>;
      })}
    </svg>
  );
}

