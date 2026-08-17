import { useEffect } from 'react';

type SEOProps = {
  title: string;
  description: string;
  robots?: string;
  image?: string;
  type?: 'website' | 'article';
};

const SITE_NAME = 'LingoMaster Aptis';
const DEFAULT_IMAGE = '/brand/og-image.svg';

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function upsertJsonLd(data: Record<string, unknown>) {
  const id = 'app-json-ld';
  let tag = document.getElementById(id) as HTMLScriptElement | null;
  if (!tag) {
    tag = document.createElement('script');
    tag.id = id;
    tag.type = 'application/ld+json';
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

export function SEO({ title, description, robots = 'index, follow', image = DEFAULT_IMAGE, type = 'website' }: SEOProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonical = `${window.location.origin}${window.location.pathname}`;
    const imageUrl = image.startsWith('http') ? image : `${window.location.origin}${image}`;

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertMeta('meta[name="theme-color"]', 'name', 'theme-color', '#2563eb');
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
    upsertLink('canonical', canonical);
    upsertJsonLd({
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: SITE_NAME,
      url: window.location.origin,
      description,
      sameAs: []
    });
  }, [description, image, robots, title, type]);

  return null;
}

export function getSeoByPath(pathname: string, isAdmin = false): SEOProps {
  if (isAdmin) {
    if (pathname.includes('/admin/users')) return { title: 'Quản lý người dùng', description: 'Quản lý học viên, trạng thái truy cập, hạn học và tài khoản trong hệ thống LingoMaster Aptis.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/content')) return { title: 'Quản lý nội dung', description: 'Tạo và cập nhật câu hỏi, bài luyện, topic, đáp án và nội dung ôn thi Aptis.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/lessons')) return { title: 'Quản lý bài học', description: 'Quản lý video, tài liệu và mẹo học Aptis cho học viên.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/mock-tests')) return { title: 'Quản lý đề thi thử', description: 'Tạo và quản lý các bộ đề thi thử Aptis theo từng kỹ năng.', robots: 'noindex, nofollow' };
    return { title: 'Bảng quản trị', description: 'Khu vực quản trị nội dung và người dùng của LingoMaster Aptis.', robots: 'noindex, nofollow' };
  }

  if (pathname.includes('/app/lessons')) return { title: 'Tài liệu và mẹo học Aptis', description: 'Học mẹo Listening, Reading, Speaking và Writing kèm tài liệu ôn tập Aptis theo từng kỹ năng.' };
  if (pathname.includes('/app/tests')) return { title: 'Luyện tập Aptis online', description: 'Luyện câu hỏi Aptis theo kỹ năng, xem đáp án và theo dõi tiến độ học tập.' };
  if (pathname.includes('/app/mock-tests')) return { title: 'Thi thử Aptis Full', description: 'Làm bài thi thử Aptis Full gồm nhiều kỹ năng trong cùng một phiên assessment.' };
  if (pathname.includes('/app/exams')) return { title: 'Đề thi Aptis', description: 'Làm đề thi Aptis theo bộ đề, chấm điểm và ôn luyện như phòng thi thật.' };
  if (pathname.includes('/app/predictions')) return { title: 'Dự đoán đề Aptis', description: 'Cập nhật dự đoán đề và chủ đề Aptis để học viên ôn tập có trọng tâm.' };
  if (pathname.includes('/app/renewal')) return { title: 'Gia hạn tài khoản Aptis', description: 'Gia hạn quyền truy cập LingoMaster Aptis và tiếp tục học tài liệu ôn thi.' };
  if (pathname.includes('/app/contact')) return { title: 'Liên hệ hỗ trợ Aptis', description: 'Liên hệ hỗ trợ tài khoản, bài học và nội dung ôn thi Aptis.' };
  return { title: 'Luyện thi Aptis online', description: 'Luyện thi Aptis online với lộ trình rõ ràng, tài liệu ôn tập, đề thi thử và theo dõi tiến độ học tập.' };
}
