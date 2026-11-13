import { materialContentHtml } from '../../utils/materialHtml';
import '../../components/material-editor.css';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { publicApi, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import './material-slider.css';
import { normalizeMaterialContent } from '../../utils/learningMaterials';

export type BlogPost = { id: number; title: string; summary: string; content: string; coverUrl: string | null; category: string; published: boolean; updatedAt: string; resourceUrl?: string | null };
export type BlogPreview = Omit<BlogPost, 'content' | 'published'>;
type Material = { id: number; title: string; description: string; content?: string; coverUrl: string | null; category: string; visible: boolean; updatedAt: string; resourceUrl?: string | null };
const toPost = (m: Material): BlogPost => ({ ...m, summary: m.description || '', content: normalizeMaterialContent(m.content || ''), published: m.visible });
const loadPosts = () => unwrap<Material[]>(publicApi.get('/learning-materials')).then(items => items.map(toPost));
const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '';

export function LegacyBlogRedirect() {
  const { id } = useParams();
  const { data, loading } = useApi(() => unwrap<Material>(publicApi.get(`/learning-materials/from-blog/${id}`)), [id]);
  if (loading) return <p className="p-8">Đang mở tài liệu…</p>;
  return <Navigate to={data ? `/learning-materials/${data.id}` : '/learning-materials'} replace />;
}

function BlogCover({ post }: { post: BlogPreview }) {
  const [failed, setFailed] = useState(false);
  return <div className="material-blog-cover relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-amber-100">
    {post.coverUrl && !failed ? <img src={post.coverUrl} alt={post.title} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> :
      <div className="flex h-full items-center justify-center gap-4 text-brand-700"><BookOpen size={48} strokeWidth={1.4} /><span className="text-xl font-extrabold">Góc học Aptis</span></div>}
    <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm">{post.category}</span>
  </div>;
}

function BlogCard({ post, compact = false }: { post: BlogPreview; compact?: boolean }) {
  return <Link to={`/learning-materials/${post.id}`} className={`${compact ? 'material-slide-card ' : ''}material-blog-card group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-brand-500`}>
    <BlogCover post={post} />
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <p className="text-xs text-slate-500">{dateLabel(post.updatedAt)} · Aptis Lingo</p>
      <h3 className="mt-3 text-xl font-extrabold leading-7 text-navy group-hover:text-brand-700">{post.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.summary}</p>
      <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-extrabold text-brand-700">Đọc bài viết <ArrowRight size={16} /></span>
    </div>
  </Link>;
}

export function BlogSection() {
  const { data, loading, error, reload } = useApi(loadPosts, []);
  const track = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const resumeAfter = useRef(0);
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const update = () => setCanScroll({ previous: node.scrollLeft > 2, next: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 });
    update();
    node.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => { node.removeEventListener('scroll', update); observer.disconnect(); };
  }, [data]);

  function moveSlide(direction: number) {
    const node = track.current;
    if (!node) return;
    resumeAfter.current = Date.now() + 8000;
    const first = node.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 16 : node.clientWidth;
    node.scrollBy({ left: direction * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  useEffect(() => {
    if (hovered || focused || !data?.length) return;
    const timer = window.setInterval(() => {
      const node = track.current;
      if (!node || document.hidden || Date.now() < resumeAfter.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (node.scrollWidth <= node.clientWidth + 2) return;
      const first = node.firstElementChild as HTMLElement | null;
      const step = first ? first.offsetWidth + 16 : node.clientWidth;
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2;
      node.scrollTo({ left: atEnd ? 0 : node.scrollLeft + step, behavior: 'smooth' });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [data, hovered, focused]);
  return <section className="material-blog-section relative bg-[#fff8f2] px-4 py-14 sm:px-6 lg:px-10 lg:py-16" aria-labelledby="home-blog-title">
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Cùng học, cùng tiến bộ</p>
          <h2 id="home-blog-title" className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl">Tài liệu học tập</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">Góc chia sẻ phương pháp ôn tập, kinh nghiệm và những ý tưởng nhỏ giúp bạn học Aptis mỗi ngày.</p></div>
        <Link to="/learning-materials" className="btn-secondary h-11 px-5 text-sm">Tất cả tài liệu <ArrowRight size={16} /></Link>
      </div>
      {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Đang tải bài viết">{[1,2,3,4].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div> :
        error ? <p className="rounded-2xl border border-brand-100 bg-white p-6 text-sm text-slate-600">Chưa tải được bài viết. <button onClick={reload} className="font-bold text-brand-700 underline">Thử lại</button></p> :
        data?.length ? <div className="material-slider" role="region" aria-label="Slide tài liệu học tập"
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
          onPointerDown={() => { resumeAfter.current = Date.now() + 8000; }} onPointerUp={() => { resumeAfter.current = Date.now() + 8000; }}>
          <div ref={track} className="material-slider-track" tabIndex={0} aria-label="Vuốt ngang để xem thêm tài liệu">
            {data.map(post => <div className="material-slider-item" key={post.id}><BlogCard post={post} compact /></div>)}
          </div>
          <div className="material-slider-controls" aria-label="Chuyển tài liệu">
            <button type="button" onClick={() => moveSlide(-1)} disabled={!canScroll.previous} aria-label="Xem tài liệu trước"><ChevronLeft size={22} /></button>
            <button type="button" onClick={() => moveSlide(1)} disabled={!canScroll.next} aria-label="Xem tài liệu tiếp theo"><ChevronRight size={22} /></button>
          </div>
        </div> :
        <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center"><BookOpen className="mx-auto text-brand-600" size={32} /><p className="mt-4 font-bold text-navy">Những bài chia sẻ đang được chuẩn bị</p><p className="mt-2 text-sm text-slate-500">Ghé lại để khám phá các bài viết học Aptis mới nhé.</p></div>}
    </div>
  </section>;
}

export function Blog() {
  const { data, loading, error, reload } = useApi(loadPosts, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const posts = (data ?? []).filter(p => (category === 'Tất cả' || p.category === category) && `${p.title} ${p.summary}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <main className="material-blog-page mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
    <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700"><ArrowLeft size={16} /> Trang chủ</Link>
    <div className="material-blog-hero my-8 rounded-3xl border border-brand-100 bg-gradient-to-br from-orange-50 to-amber-50 p-8 sm:p-12"><p className="text-xs font-extrabold uppercase tracking-widest text-brand-700">Góc học Aptis Lingo</p><h1 className="mt-3 text-4xl font-extrabold text-navy">Tài liệu học tập</h1><p className="mt-4 max-w-2xl leading-7 text-slate-600">Đọc một chút, hiểu thêm một chút. Khám phá những cách học và kinh nghiệm ôn Aptis dành cho bạn.</p></div>
    <div className="mb-8 flex flex-wrap items-center gap-3"><label className="material-blog-search flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4"><Search size={18} className="text-slate-400" /><input aria-label="Tìm bài viết" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài viết…" className="h-11 min-w-0 bg-transparent outline-none" /></label><select aria-label="Chủ đề" className="input h-11" value={category} onChange={e => setCategory(e.target.value)}>{['Tất cả', ...new Set((data ?? []).map(p => p.category))].map(c => <option key={c}>{c}</option>)}</select></div>
    {loading ? <p role="status">Đang tải bài viết…</p> : error ? <p>Chưa tải được bài viết. <button onClick={reload} className="text-brand-700 underline">Thử lại</button></p> : posts.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map(post => <BlogCard key={post.id} post={post} />)}</div> : <p className="rounded-2xl bg-white p-8 text-center text-slate-500">{data?.length ? 'Không tìm thấy bài viết phù hợp.' : 'Chưa có bài viết được đăng.'}</p>}
  </main>;
}

export function BlogDetail() {
  const { id } = useParams();
  const { data: post, loading, error, reload } = useApi(() => unwrap<Material>(publicApi.get(`/learning-materials/${id}`)).then(toPost), [id]);
  const { data: posts } = useApi(loadPosts, []);
  const related = (posts ?? []).filter(item => item.id !== post?.id)
    .sort((a, b) => Number(b.category === post?.category) - Number(a.category === post?.category)
      || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || b.id - a.id)
    .slice(0, 3);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [id]);
  return <main className="material-blog-page mx-auto max-w-[900px] px-4 py-10 sm:px-6">
    <Link to="/learning-materials" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700"><ArrowLeft size={16} /> Tài liệu học tập</Link>
    {loading ? <p className="mt-8" role="status">Đang tải bài viết…</p> : error || !post ? <div className="mt-8 rounded-2xl bg-white p-8"><p>Bài viết chưa được đăng hoặc không thể tải lúc này.</p><button onClick={reload} className="mt-4 text-brand-700 underline">Thử lại</button></div> :
      <article className="mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white">
        <div className="p-6 sm:p-10"><span className="text-sm font-bold text-brand-700">{post.category}</span><h1 className="mt-4 text-3xl font-extrabold leading-tight text-navy sm:text-4xl">{post.title}</h1><p className="mt-4 text-sm text-slate-500">Aptis Lingo · Cập nhật {dateLabel(post.updatedAt)}</p><p className="mt-6 border-l-4 border-brand-500 pl-5 text-lg leading-8 text-slate-600">{post.summary}</p></div>
        {post.coverUrl && <BlogCover key={post.coverUrl} post={post} />}
        <div className="material-rich-content p-6 text-base text-slate-700 sm:p-10" dangerouslySetInnerHTML={{ __html: materialContentHtml(post.content) }} />
      </article>}
    {!loading && !error && post && related.length > 0 && <section className="mt-10" aria-labelledby="related-posts-title">
      <h2 id="related-posts-title" className="mb-5 text-xl font-extrabold text-brand-700">Bài viết liên quan</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map(item => <Link key={item.id} to={`/learning-materials/${item.id}`} className="group overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-brand-500">
          <BlogCover key={item.coverUrl} post={item} />
          <div className="p-3 sm:p-4">
            <h3 className="break-words text-sm font-bold leading-6 text-navy group-hover:text-brand-700">{item.title}</h3>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={14} aria-hidden="true" /><time dateTime={item.updatedAt}>{dateLabel(item.updatedAt)}</time></p>
          </div>
        </Link>)}
      </div>
    </section>}
  </main>;
}
