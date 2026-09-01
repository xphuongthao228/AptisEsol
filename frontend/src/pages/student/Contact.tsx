import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Clock, ExternalLink, HelpCircle, Mail, MessageCircle, QrCode, Send, Users, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const adminEmail = 'admin@aptis.com';
const facebookGroupUrl = 'https://www.facebook.com/groups/1017783430680359';
const zaloCommunityUrl = 'https://zalo.me/g/n1f3m9mamomr1vnhs6lw';
const zaloQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(zaloCommunityUrl)}`;

const contactCards = [
  {
    icon: <HelpCircle size={22} />,
    title: 'Hỗ trợ tài khoản',
    text: 'Báo lỗi đăng nhập, gia hạn, không tải được dữ liệu hoặc cần kiểm tra quyền học.'
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'Góp ý nội dung',
    text: 'Gửi câu hỏi sai, phần mẹo cần bổ sung hoặc đề xuất bài luyện mới.'
  },
  {
    icon: <Clock size={22} />,
    title: 'Phản hồi nhanh',
    text: 'Nên ghi rõ email tài khoản, lỗi gặp ở trang nào và ảnh chụp màn hình nếu có.'
  }
];

export function Contact() {
  const user = useAuthStore((state) => state.user);
  const [subject, setSubject] = useState('Cần hỗ trợ Aptis Keys');
  const [message, setMessage] = useState('');

  function submitContact(event: FormEvent) {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung liên hệ');
      return;
    }

    const body = [
      `Họ tên: ${user?.fullName ?? ''}`,
      `Email tài khoản: ${user?.email ?? ''}`,
      '',
      message.trim()
    ].join('\n');

    window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
    toast.success('Đã mở ứng dụng email để gửi liên hệ');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="overflow-hidden rounded-[28px] border border-brand-100 bg-white shadow-soft">
        <div className="bg-[linear-gradient(135deg,#06204a,#0057d9)] px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-200">Liên hệ</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Cần hỗ trợ gì, gửi admin ngay tại đây</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Trang này giúp bạn tạo email liên hệ nhanh với sẵn thông tin tài khoản để admin dễ kiểm tra.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-navy">
                  <Mail size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Email admin</p>
                  <p className="mt-1 font-extrabold">{adminEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          {contactCards.map((card) => (
            <div key={card.title} className="p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">{card.icon}</div>
              <h2 className="mt-4 font-extrabold text-navy">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-[24px] border border-brand-100 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-navy">Tham gia cộng đồng</h2>
              <p className="mt-1 text-sm text-slate-600">Vào group để nhận thông báo, hỏi bài và trao đổi kinh nghiệm học Aptis.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href={facebookGroupUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1877f2] px-4 text-sm font-extrabold text-white hover:bg-[#0f65d8]">
              <ExternalLink size={18} />
              Group Facebook
            </a>
            <a href={zaloCommunityUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0068ff] px-4 text-sm font-extrabold text-white hover:bg-[#0054cc]">
              <MessageCircle size={18} />
              Cộng đồng Zalo
            </a>
          </div>
        </div>

        <div className="rounded-[24px] border border-brand-100 bg-white p-5 text-center shadow-soft">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-navy">
            <QrCode size={22} />
          </div>
          <h2 className="font-extrabold text-navy">QR Zalo</h2>
          <img src={zaloQrUrl} alt="QR cộng đồng Zalo Tự ôn Aptis" className="mx-auto mt-4 w-full max-w-[220px] rounded-2xl border border-brand-100 bg-white p-2" />
          <a href={zaloCommunityUrl} target="_blank" rel="noreferrer" className="mt-4 block break-all rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-brand-700">
            zalo.me/g/n1f3m9mamomr1vnhs6lw
          </a>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submitContact} className="rounded-[24px] border border-brand-100 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Send size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-navy">Tạo nội dung liên hệ</h2>
              <p className="mt-0.5 text-sm text-slate-600">Nội dung sẽ được mở bằng ứng dụng email trên máy của bạn.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Tiêu đề</span>
              <input className="input h-12 rounded-2xl bg-white" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="VD: Cần hỗ trợ gia hạn" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-700">Nội dung</span>
              <textarea
                className="input min-h-[180px] resize-y rounded-2xl bg-white py-3"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Bạn mô tả lỗi hoặc nội dung cần hỗ trợ ở đây..."
              />
            </label>
          </div>

          <button className="btn-primary mt-6 h-12 w-full rounded-2xl">
            <Send size={18} />
            Gửi liên hệ
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-navy">
                <UserRound size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-navy">Thông tin tài khoản</h2>
                <p className="truncate text-sm text-slate-600">{user?.email ?? 'Email học viên'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              Email gửi đi sẽ tự kèm tên và email tài khoản hiện tại để admin dễ đối chiếu.
            </p>
          </div>

          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-extrabold text-emerald-950">Muốn donate riêng?</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              Ghi rõ bạn muốn ủng hộ web trong nội dung liên hệ, admin sẽ gửi thông tin nhận donate.
            </p>
            <Link to="/app/donate" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
              Xem trang donate
              <ArrowRight size={17} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
