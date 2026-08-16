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
    if (pathname.includes('/admin/users')) return { title: 'Quan ly nguoi dung', description: 'Quan ly hoc vien, trang thai truy cap, han hoc va tai khoan trong he thong LingoMaster Aptis.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/content')) return { title: 'Quan ly noi dung', description: 'Tao va cap nhat cau hoi, bai luyen, topic, dap an va noi dung on thi Aptis.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/lessons')) return { title: 'Quan ly bai hoc', description: 'Quan ly video, tai lieu va meo hoc Aptis cho hoc vien.', robots: 'noindex, nofollow' };
    if (pathname.includes('/admin/mock-tests')) return { title: 'Quan ly de thi thu', description: 'Tao va quan ly cac bo de thi thu Aptis theo tung ky nang.', robots: 'noindex, nofollow' };
    return { title: 'Bang quan tri', description: 'Khu vuc quan tri noi dung va nguoi dung cua LingoMaster Aptis.', robots: 'noindex, nofollow' };
  }

  if (pathname.includes('/app/lessons')) return { title: 'Tai lieu va meo hoc Aptis', description: 'Hoc meo Listening, Reading, Speaking va Writing kem tai lieu on tap Aptis theo tung ky nang.' };
  if (pathname.includes('/app/tests')) return { title: 'Luyen tap Aptis online', description: 'Luyen cau hoi Aptis theo ky nang, xem dap an va theo doi tien do hoc tap.' };
  if (pathname.includes('/app/mock-tests')) return { title: 'Thi thu Aptis Full', description: 'Lam bai thi thu Aptis Full gom nhieu ky nang trong cung mot phien assessment.' };
  if (pathname.includes('/app/exams')) return { title: 'De thi Aptis', description: 'Lam de thi Aptis theo bo de, cham diem va on luyen nhu phong thi that.' };
  if (pathname.includes('/app/predictions')) return { title: 'Du doan de Aptis', description: 'Cap nhat du doan de va chu de Aptis de hoc vien on tap co trong tam.' };
  if (pathname.includes('/app/renewal')) return { title: 'Gia han tai khoan Aptis', description: 'Gia han quyen truy cap LingoMaster Aptis va tiep tuc hoc tai lieu on thi.' };
  if (pathname.includes('/app/contact')) return { title: 'Lien he ho tro Aptis', description: 'Lien he ho tro tai khoan, bai hoc va noi dung on thi Aptis.' };
  return { title: 'Hoc Aptis online', description: 'LingoMaster Aptis giup hoc vien luyen Listening, Reading, Speaking, Writing, lam de va hoc tai lieu on thi.' };
}
