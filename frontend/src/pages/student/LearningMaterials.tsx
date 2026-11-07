import { useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { publicApi, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { materialColors, type LearningMaterial } from '../../utils/learningMaterials';
import './learning-materials.css';

export function LearningMaterials() {
  const { data, loading, error, reload } = useApi<LearningMaterial[]>(() => unwrap(publicApi.get('/learning-materials')));
  const collections = data ?? [];
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const moveTo = (index: number) => {
    const element = track.current;
    if (element) element.scrollTo({ left: index / Math.max(1, collections.length - 1) * (element.scrollWidth - element.clientWidth), behavior: 'smooth' });
  };
  return <section className="learning-materials" aria-label="Tài liệu học tập">
    <div className="learning-materials-heading">
      <h2><FileText size={20} />Tài liệu học tập</h2>
      {!!collections.length && <button type="button" onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : 'Xem tất cả →'}</button>}
    </div>
    {loading ? <p className="text-sm text-slate-500">Đang tải tài liệu...</p> : error ? <div className="text-sm text-slate-500">Chưa tải được tài liệu. <button type="button" onClick={reload} className="font-bold text-red-700">Thử lại</button></div> : !collections.length ? <p className="text-sm text-slate-500">Tài liệu học tập đang được cập nhật.</p> : <>
    <div className="learning-materials-carousel">
      {!expanded && collections.length > 1 && <button type="button" className="materials-arrow materials-arrow-prev" onClick={() => moveTo(Math.max(0, active - 1))} aria-label="Tài liệu trước"><ChevronLeft size={18} /></button>}
      <div ref={track} className={`learning-materials-track${expanded ? ' is-expanded' : ''}`} onScroll={() => {
        const element = track.current;
        if (element) setActive(Math.round(element.scrollLeft / Math.max(1, element.scrollWidth - element.clientWidth) * (collections.length - 1)));
      }}>
        {collections.map(collection => {
          const [color, ink] = materialColors[collection.category] ?? materialColors.Grammar;
          return <article className="learning-material-card" key={collection.id}>
            <div className="learning-material-cover" style={{ background: color, color: ink }} aria-hidden="true">
              {collection.coverUrl ? <img src={collection.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="learning-material-book"><BookOpen size={18} /><span>Aptis<br />{collection.category}</span><i /><i /><i /></div>}
            </div>
            <div className="learning-material-info"><h3>{collection.title}</h3><p>{collection.description}</p>
              {collection.resourceUrl ? <a href={collection.resourceUrl} download target="_blank" rel="noopener noreferrer" aria-label={`Tải ${collection.title}`} className="learning-material-download"><Download size={16} /></a> : <small>Đang cập nhật</small>}
            </div>
          </article>;
        })}
      </div>
      {!expanded && collections.length > 1 && <button type="button" className="materials-arrow materials-arrow-next" onClick={() => moveTo(Math.min(collections.length - 1, active + 1))} aria-label="Tài liệu tiếp theo"><ChevronRight size={18} /></button>}
    </div>
    {!expanded && collections.length > 1 && <div className="learning-material-dots">{collections.map((item, index) => <button type="button" key={item.id} className={index === active ? 'is-active' : ''} onClick={() => moveTo(index)} aria-label={`Xem ${item.title}`} aria-current={index === active ? 'true' : undefined} />)}</div>}
    </>}
  </section>;
}
