import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, FileText, Headphones, Lightbulb, Lock, Mail, Mic, PenLine, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { SubscriptionResponse } from '../../types';
import { formatSubscriptionDate, getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

type SkillKey = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';

type TipItem = {
  title: string;
  description: string;
  color: string;
  button: string;
  points: string[];
};

type SkillTip = {
  key: SkillKey;
  label: string;
  title: string;
  subtitle: string;
  icon: JSX.Element;
  practicePath: string;
  sections: TipItem[];
};

const skillTips: SkillTip[] = [
  {
    key: 'LISTENING',
    label: 'Listening',
    title: 'Mẹo học các câu phần Listening',
    subtitle: 'Học theo nhóm câu để biết phần nào cần nghe kỹ, phần nào có thể ăn điểm nhanh.',
    icon: <Headphones size={22} />,
    practicePath: '/app/tests/questions/LISTENING',
    sections: [
      {
        title: 'Câu 1-13: Nhóm dễ ăn điểm nhất',
        description: 'Thường hỏi thông tin ngắn như đồ vật, thời gian, địa điểm, hoạt động. Luyện đủ dạng sẽ nhận ra đáp án rất nhanh.',
        color: 'bg-brand-600 text-white',
        button: 'Học câu 1-13',
        points: ['Đọc câu hỏi trước khi nghe để bắt keyword.', 'Chú ý từ đồng nghĩa vì audio thường không đọc y nguyên đáp án.', 'Nếu lỡ một câu, bỏ qua ngay để giữ nhịp cho câu tiếp theo.']
      },
      {
        title: 'Câu 14: Câu khó nhất trong Listening',
        description: 'Có nhiều đáp án gây nhiễu. Hãy nghe quan điểm chính của từng người thay vì chỉ bám vào một từ khóa.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Học câu 14',
        points: ['Ghi nhanh tên người hoặc thứ tự người nói.', 'Loại đáp án xuất hiện nhưng bị phủ định.', 'Nếu thiếu thời gian, học chắc các mẫu đáp án hay gặp.']
      },
      {
        title: 'Câu 15: Nhóm tương đối dễ học',
        description: 'Thường là dạng nối người với ý kiến hoặc thông tin. Cần phân biệt ai đang nói và thái độ của họ.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Học câu 15',
        points: ['Tập nghe các từ báo hiệu ý kiến: think, prefer, agree, worried.', 'Không chọn theo từ đơn lẻ, hãy chọn theo ý chính.', 'Ghi lại các cụm đồng nghĩa sau mỗi bài.']
      },
      {
        title: 'Câu 16 & 17: Hai câu cuối dễ mất điểm nếu vội',
        description: 'Cần nghe ý tổng quát và tránh nhầm giữa chi tiết phụ với kết luận của người nói.',
        color: 'bg-emerald-700 text-white',
        button: 'Học câu 16 & 17',
        points: ['Lần một nghe chủ đề, lần hai khóa đáp án.', 'Ưu tiên đáp án khớp với kết luận cuối.', 'Cẩn thận bẫy đổi thời gian, đổi người, đổi lý do.']
      }
    ]
  },
  {
    key: 'READING',
    label: 'Reading',
    title: 'Mẹo học các câu phần Reading',
    subtitle: 'Chia Reading theo từng part: điền từ, sắp xếp câu, đọc forum và nối tiêu đề.',
    icon: <BookOpen size={22} />,
    practicePath: '/app/tests/questions/READING',
    sections: [
      {
        title: 'Part 1: Câu hỏi đầu tiên',
        description: 'Dạng điền từ vào đoạn ngắn. Điểm nằm ở ngữ pháp cơ bản và cụm từ quen thuộc.',
        color: 'bg-brand-600 text-white',
        button: 'Học câu 1',
        points: ['Đọc cả câu trước và sau ô trống.', 'Kiểm tra loại từ cần điền: danh từ, động từ, tính từ.', 'Chọn từ làm câu tự nhiên nhất, đúng thì và đúng ngữ cảnh.']
      },
      {
        title: 'Part 2 & 3: Sắp xếp câu',
        description: 'Cần tìm câu mở đầu, câu nối ý và câu kết. Dùng dấu hiệu liên kết để xếp thứ tự.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Học câu 2 & 3',
        points: ['Tìm câu tổng quan trước.', 'Để ý đại từ this, that, they và từ nối however, because, after that.', 'Đọc lại cả đoạn sau khi sắp xếp để kiểm tra mạch văn.']
      },
      {
        title: 'Part 4: Đọc ý kiến bốn người',
        description: 'Đọc nhanh từng người A, B, C, D và gắn keyword riêng cho mỗi người.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Học câu 4',
        points: ['Gạch ý chính của từng người.', 'Câu hỏi hay dùng từ đồng nghĩa, không phải từ y nguyên.', 'Nếu phân vân, chọn người có ý gần nhất với cả câu hỏi.']
      },
      {
        title: 'Part 5: Nối tiêu đề với đoạn',
        description: 'Không cần dịch từng từ. Hãy tìm keyword và ý chính của mỗi đoạn.',
        color: 'bg-emerald-700 text-white',
        button: 'Mẹo học nhanh Part 5',
        points: ['Đọc danh sách tiêu đề trước.', 'Đọc câu đầu và câu cuối của mỗi đoạn.', 'Loại tiêu đề quá chi tiết hoặc chỉ đúng với một ví dụ nhỏ.']
      }
    ]
  },
  {
    key: 'SPEAKING',
    label: 'Speaking',
    title: 'Mẹo học các câu phần Speaking',
    subtitle: 'Tập trả lời ngắn gọn, đúng trọng tâm và có cấu trúc để nói tự nhiên hơn.',
    icon: <Mic size={22} />,
    practicePath: '/app/tests/questions/SPEAKING',
    sections: [
      {
        title: 'Part 1: Thông tin bản thân',
        description: 'Gồm các câu hỏi quen thuộc về gia đình, bạn bè, sở thích, quê hương, thời tiết.',
        color: 'bg-brand-600 text-white',
        button: 'Học câu 1',
        points: ['Trả lời 2-3 câu ngắn, rõ ý.', 'Dùng ví dụ cá nhân để câu trả lời tự nhiên.', 'Không học thuộc quá dài vì dễ bị quên.']
      },
      {
        title: 'Part 2: Mô tả 1 hình ảnh và 2 câu hỏi phụ',
        description: 'Cần mô tả ảnh trước, sau đó trả lời thêm hai câu liên quan đến chủ đề.',
        color: 'bg-emerald-700 text-white',
        button: 'Mẹo học nhanh Part 2',
        points: ['Nói vị trí, hành động, cảm xúc và bối cảnh trong ảnh.', 'Trả lời đủ ba câu, không bỏ sót câu phụ.', 'Dùng từ nối đơn giản: firstly, also, because, in my opinion.']
      },
      {
        title: 'Part 3: So sánh hai hình ảnh',
        description: 'Mô tả hai ảnh, so sánh điểm giống/khác và đưa ra ý kiến.',
        color: 'bg-rose-600 text-white',
        button: 'Học câu 3',
        points: ['Dùng mẫu: In the first picture..., while in the second picture...', 'Nếu hình khó, tập trung vào bối cảnh và cảm xúc.', 'Nên có một câu kết về ý kiến cá nhân.']
      },
      {
        title: 'Part 4: Kể về một trải nghiệm',
        description: 'Thường hỏi về một lần bạn làm gì đó trong quá khứ. Cần có câu chuyện ngắn, lý do và bài học.',
        color: 'bg-emerald-700 text-white',
        button: 'Học câu 4',
        points: ['Dùng cấu trúc: situation - action - result - feeling.', 'Dùng thì quá khứ nếu kể chuyện cũ.', 'Chuẩn bị sẵn các mẫu về money, book, sport, team, good news.']
      }
    ]
  },
  {
    key: 'WRITING',
    label: 'Writing',
    title: 'Mẹo viết thư và trả lời Writing',
    subtitle: 'Tổng hợp mẹo viết form, chat và email theo từng phần của Aptis Writing.',
    icon: <PenLine size={22} />,
    practicePath: '/app/tests/questions/WRITING',
    sections: [
      {
        title: 'Part 1: Form ngắn 1-5 từ',
        description: 'Trả lời ngắn, đúng thông tin và đúng chính tả. Không viết câu dài.',
        color: 'bg-brand-600 text-white',
        button: 'Học Writing Part 1',
        points: ['Viết hoa tên riêng, quốc gia, thành phố.', 'Nếu hỏi sở thích, trả lời bằng cụm ngắn: reading books, playing football.', 'Kiểm tra spelling trước khi sang câu tiếp.']
      },
      {
        title: 'Part 2: Form 20-30 từ',
        description: 'Viết 2-3 câu hoàn chỉnh, trả lời trực tiếp đúng yêu cầu của đề.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Học Writing Part 2',
        points: ['Mở đầu bằng câu trả lời trực tiếp.', 'Thêm một lý do hoặc ví dụ nhỏ.', 'Cần đếm từ, thiếu quá hoặc dài quá đều mất điểm.']
      },
      {
        title: 'Part 3: Chat 30-40 từ mỗi câu',
        description: 'Trả lời từng tin nhắn theo giọng thân thiện, có lý do và gợi ý rõ ràng.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Học Writing Part 3',
        points: ['Mỗi câu nên có ý chính + lý do + ví dụ ngắn.', 'Dùng câu nối tự nhiên: I think, For example, Maybe you should.', 'Không lặp một cấu trúc quá nhiều lần.']
      },
      {
        title: 'Part 4: Email thân mật và trang trọng',
        description: 'Viết hai email: một email ngắn cho bạn và một email dài, lịch sự hơn cho người quản lý hoặc chủ tịch.',
        color: 'bg-emerald-700 text-white',
        button: 'Học Writing Part 4',
        points: ['Email cho bạn: thân mật, tự nhiên, có cảm xúc.', 'Email trang trọng: Dear..., I am writing to..., I would like to...', 'Kết thư bằng Best wishes hoặc Yours sincerely tùy ngữ cảnh.']
      }
    ]
  }
];

export function Lessons() {
  const [activeSkill, setActiveSkill] = useState<SkillKey>('READING');
  const current = useMemo(() => skillTips.find((item) => item.key === activeSkill) ?? skillTips[0], [activeSkill]);

  const { data: subscription } = useApi<SubscriptionResponse | null>(
    () => unwrap<SubscriptionResponse>(api.get('/payments/subscription/me')).catch(() => null),
    []
  );

  if (subscription?.expiresAt) {
    saveSubscriptionUntil(subscription.expiresAt);
  }

  const status = getSubscriptionStatus();
  const expireDate = subscription?.expiresAt ? new Date(subscription.expiresAt) : status.expireDate;
  const hasAccess = subscription?.active ?? status.active;

  return (
    <div className="space-y-6">
      <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-600 hover:text-brand-600">
        <ArrowLeft size={18} /> Quay lại luyện tập
      </Link>

      <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-200">Thư viện mẹo Aptis</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-5xl">Học mẹo theo từng kỹ năng</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              Chọn Listening, Reading, Speaking hoặc Writing để xem các mẹo ôn thi ngắn gọn, đúng trọng tâm.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-300" />
              <div>
                <p className="font-extrabold">Aptis Pro Access</p>
                <p className="text-sm text-slate-300">{hasAccess ? `Còn hạn đến ${formatSubscriptionDate(expireDate)}` : 'Cần gia hạn để học đầy đủ'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasAccess && (
        <section className="flex flex-col gap-4 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 shrink-0" size={20} />
            <div>
              <h2 className="font-extrabold">Tài khoản đã hết hạn học</h2>
              <p className="text-sm">Bạn vẫn xem được danh sách mẹo, nhưng cần gia hạn để vào bài luyện đầy đủ.</p>
            </div>
          </div>
          <Link to="/app/renew" className="btn-primary h-11 px-5">Gia hạn ngay</Link>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        {skillTips.map((skill) => (
          <button
            key={skill.key}
            type="button"
            onClick={() => setActiveSkill(skill.key)}
            className={`rounded-2xl border p-4 text-left shadow-soft transition ${
              activeSkill === skill.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
            }`}
          >
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-current">{skill.icon}</span>
            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-70">Kỹ năng</span>
            <span className="mt-1 block text-xl font-extrabold">{skill.label}</span>
          </button>
        ))}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-brand-700">
              <Lightbulb size={15} /> Mẹo học
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950 sm:text-3xl">{current.title}</h2>
            <p className="mt-2 max-w-3xl leading-7 text-slate-500">{current.subtitle}</p>
          </div>
          <Link to={current.practicePath} className="btn-secondary h-11 px-5">
            Vào luyện tập <ArrowRight size={18} />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {current.sections.map((section) => (
            <article key={section.title} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
              <div className={`${section.color} px-5 py-4`}>
                <h3 className="text-lg font-extrabold">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 opacity-90">{section.description}</p>
              </div>
              <div className="space-y-3 p-5">
                {section.points.map((point) => (
                  <div key={point} className="flex gap-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                    <span>{point}</span>
                  </div>
                ))}
                <Link to={current.practicePath} className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-600 px-4 text-sm font-extrabold text-brand-600 hover:bg-brand-50">
                  <BookOpen size={16} /> {section.button}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MaterialCard
          icon={<Mail />}
          title="Checklist Writing trước khi nộp"
          items={['Đúng số từ yêu cầu của từng part.', 'Có mở bài, thân bài và kết bài rõ nếu là email.', 'Dùng giọng thân mật cho bạn bè, trang trọng cho người quản lý.', 'Kiểm tra thì động từ, dấu câu, viết hoa và chính tả.']}
        />
        <MaterialCard
          icon={<FileText />}
          title="Cách học mẹo hiệu quả"
          items={['Đọc mẹo trước, làm 3-5 câu cùng dạng, rồi xem lại lỗi.', 'Ghi câu sai thành danh sách bẫy riêng.', 'Khi làm bộ đề, chỉ kiểm tra đáp án ở cuối để giữ cảm giác thi thật.', 'Ôn lại mẹo trước ngày thi thay vì học thêm quá nhiều dạng mới.']}
        />
      </section>
    </div>
  );
}

function MaterialCard({ icon, title, items }: { icon: JSX.Element; title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div>
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700" key={item}>
            <FileText className="mt-0.5 shrink-0 text-brand-600" size={18} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
