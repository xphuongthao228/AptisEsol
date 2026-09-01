import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileText, Headphones, Lightbulb, Lock, Mail, Mic, PenLine, PlayCircle, Puzzle, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState, type MouseEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { Lesson, SubscriptionResponse } from '../../types';
import { formatSubscriptionDate, getSubscriptionStatus, saveSubscriptionUntil } from '../../utils/subscription';

type SkillKey = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';
type ResourceKind = 'VIDEO' | 'DOCUMENT';

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

type TipAction = {
  label: string;
  to: string;
  tone: 'blue' | 'cyan' | 'green' | 'amber' | 'red';
  icon: 'book' | 'puzzle' | 'lightbulb' | 'clipboard';
};

type TipLandingSection = {
  title: string;
  description: string;
  actions: TipAction[];
};

function useRequireLogin() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (accessToken) return;

    event.preventDefault();
    toast.error('Bạn cần đăng nhập để học bài.', { id: 'login-required' });
  };
}

type TipLanding = {
  title: string;
  sections: TipLandingSection[];
};

type LearningResource = {
  title: string;
  description: string;
  content?: string;
  meta: string;
  tags: string[];
  to?: string;
  href?: string;
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
        points: ['Đọc câu hỏi trước khi nghe để bắt keyword.', 'Chú ý từ đồng nghĩa vì audio thường không đọc y nguyên đáp án.', 'Nếu lỡ mất câu, bỏ qua ngay để giữ nhịp cho câu tiếp theo.']
      },
      {
        title: 'Câu 14: Câu khó nhất trong Listening',
        description: 'Có nhiều đáp án gây nhiễu. Hãy nghe quan điểm chính của từng người thay vì chỉ bám vào một từ khóa.',
        color: 'bg-cyan-500 text-navy',
        button: 'Học câu 14',
        points: ['Ghi nhanh tên người hoặc thứ tự người nói.', 'Loại đáp án xuất hiện nhưng bị phủ định.', 'Nếu thiếu thời gian, học chọn lọc các mẫu đáp án hay gặp.']
      },
      {
        title: 'Câu 15: Nhóm tương đối dễ học',
        description: 'Thường là dạng nối người với ý kiến hoặc thông tin. Cần phân biệt ai đang nói và thái độ của họ.',
        color: 'bg-amber-400 text-navy',
        button: 'Học câu 15',
        points: ['Tập nghe các từ báo hiệu ý kiến: think, prefer, agree, worried.', 'Không chọn theo từ đơn lẻ, hãy chọn theo ý chính.', 'Ghi lại các cụm đồng nghĩa sau mỗi bài.']
      },
      {
        title: 'Câu 16 & 17: Hai câu cuối dễ lấy điểm nếu vững',
        description: 'Cần nghe ý từng đoạn và tránh nhầm giữa chi tiết phụ với kết luận của người nói.',
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
        color: 'bg-cyan-500 text-navy',
        button: 'Học câu 2 & 3',
        points: ['Tìm câu tổng quan trước.', 'Để ý đại từ this, that, they và từ nối however, because, after that.', 'Đọc lại cả đoạn sau khi sắp xếp để kiểm tra mạch văn.']
      },
      {
        title: 'Part 4: Đọc ý kiến bốn người',
        description: 'Đọc nhanh từng người A, B, C, D và gắn keyword riêng cho mỗi người.',
        color: 'bg-amber-400 text-navy',
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
        color: 'bg-cyan-500 text-navy',
        button: 'Học Writing Part 2',
        points: ['Mở đầu bằng câu trả lời trực tiếp.', 'Thêm một lý do hoặc ví dụ nhỏ.', 'Cần đếm từ, thiếu quá hoặc dài quá đều mất điểm.']
      },
      {
        title: 'Part 3: Chat 30-40 từ mỗi câu',
        description: 'Trả lời từng tin nhắn theo giọng thân thiện, có lý do và gợi ý rõ ràng.',
        color: 'bg-amber-400 text-navy',
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

const tipLanding: Record<SkillKey, TipLanding> = {
  LISTENING: {
    title: 'Mẹo học các câu phần Listening',
    sections: [
      {
        title: 'Câu 1-13: Các câu này dễ ăn điểm nhất',
        description: 'Câu 1-13 có khoảng hơn 150 câu. Bạn nên học kỹ câu hỏi và đáp án mẫu để khi vào thi gặp đáp án tương tự có thể chọn nhanh.',
        actions: [{ label: 'Học câu 1 - 13', to: '/app/tests/questions/LISTENING/part/1', tone: 'blue', icon: 'book' }]
      },
      {
        title: 'Câu 14: Đây là câu khó nhất trong các phần',
        description: 'Bài này có 6 đáp án, trong đó có đáp án gây nhiễu. Hãy học theo key, nghe kỹ người nói và loại đáp án bị phủ định trước khi chọn.',
        actions: [{ label: 'Học câu 14', to: '/app/tests/questions/LISTENING/part/2', tone: 'cyan', icon: 'puzzle' }]
      },
      {
        title: 'Câu 15: Câu này tương đối dễ học',
        description: 'Part này không quá khó và số lượng câu hỏi ít. Học theo nhóm đáp án sẽ dễ nhớ hơn.',
        actions: [{ label: 'Mẹo học câu 15', to: '/app/lessons/LISTENING/cau-15', tone: 'green', icon: 'lightbulb' }]
      },
      {
        title: 'Câu 16 & 17: Hai câu này dễ ăn điểm',
        description: 'Bạn nên học kỹ các đáp án bên dưới và luyện nhận diện keyword. Khi đã quen, nhìn lựa chọn sẽ biết đáp án nào phù hợp hơn.',
        actions: [{ label: 'Học câu 16 & 17', to: '/app/tests/questions/LISTENING/part/4', tone: 'green', icon: 'lightbulb' }]
      }
    ]
  },
  READING: {
    title: 'Mẹo học các câu phần Reading',
    sections: [
      {
        title: 'Part 1: Câu hỏi đầu tiên',
        description: 'Part này nên học hết các câu hỏi mẫu và chú ý loại từ cần điền.',
        actions: [{ label: 'Học câu 1', to: '/app/tests/questions/READING/part/1', tone: 'blue', icon: 'book' }]
      },
      {
        title: 'Part 2 & 3: Câu hỏi thứ hai và thứ ba',
        description: 'Part này cần học đầy đủ các câu hỏi mẫu, đặc biệt là cách nối ý và sắp xếp câu.',
        actions: [{ label: 'Học câu 2 & 3', to: '/app/tests/questions/READING/part/2', tone: 'cyan', icon: 'puzzle' }]
      },
      {
        title: 'Part 4: Câu hỏi thứ tư',
        description: 'Part này không quá khó và số lượng câu hỏi ít. Hãy luyện đọc ý chính của từng người.',
        actions: [{ label: 'Học câu 4', to: '/app/tests/questions/READING/part/4', tone: 'amber', icon: 'clipboard' }]
      },
      {
        title: 'Part 5: Câu hỏi thứ năm',
        description: 'Part này có thể học theo key, theo thẻ hoặc theo đoạn văn. Mỗi bài có mẹo riêng, học đúng mẹo sẽ làm nhanh hơn.',
        actions: [{ label: 'Mẹo học nhanh (chỉ học đáp án)', to: '/app/tests/questions/READING/part/5', tone: 'green', icon: 'lightbulb' }]
      }
    ]
  },
  SPEAKING: {
    title: 'Mẹo học các câu phần Speaking',
    sections: [
      {
        title: 'Part 1: Phần này gồm 3 câu hỏi',
        description: 'Part này nên học hết các câu hỏi mẫu. Khi đi thi thường xoay quanh các chủ đề quen thuộc này.',
        actions: [{ label: 'Học câu 1', to: '/app/tests/questions/SPEAKING/part/1', tone: 'blue', icon: 'book' }]
      },
      {
        title: 'Part 2: Mô tả 1 hình ảnh và 2 câu hỏi phụ',
        description: 'Part này có thể học một form chung rồi áp dụng linh hoạt cho từng bức ảnh.',
        actions: [
          { label: 'Mẹo học nhanh', to: '/app/tests/questions/SPEAKING/part/2', tone: 'green', icon: 'lightbulb' },
          { label: 'Học đầy đủ câu 2 này', to: '/app/tests/questions/SPEAKING/part/2', tone: 'amber', icon: 'clipboard' }
        ]
      },
      {
        title: 'Part 3: Mô tả 2 hình ảnh và 2 câu hỏi phụ',
        description: 'Part này giống Part 2 nhưng có hai hình ảnh. Bạn mô tả, so sánh điểm khác biệt rồi áp dụng form đã học.',
        actions: [{ label: 'Học câu 3', to: '/app/tests/questions/SPEAKING/part/3', tone: 'red', icon: 'clipboard' }]
      },
      {
        title: 'Part 4: Thường là kể về một trải nghiệm',
        description: 'Mẹo part này đã được trình bày trong phần câu hỏi 4. Bạn xem lại câu hỏi và học kỹ là được.',
        actions: [{ label: 'Học câu 4', to: '/app/tests/questions/SPEAKING/part/4', tone: 'green', icon: 'lightbulb' }]
      }
    ]
  },
  WRITING: {
    title: 'Mẹo học các câu phần Writing',
    sections: [
      {
        title: 'Part 1: Form ngắn',
        description: 'Học cách trả lời ngắn, đúng thông tin, đúng chính tả và không viết quá dài.',
        actions: [{ label: 'Học Writing Part 1', to: '/app/tests/questions/WRITING/part/1', tone: 'blue', icon: 'book' }]
      },
      {
        title: 'Part 2: Form 20-30 từ',
        description: 'Trả lời trực tiếp, thêm một lý do hoặc ví dụ nhỏ, kiểm tra số từ trước khi nộp.',
        actions: [{ label: 'Học Writing Part 2', to: '/app/tests/questions/WRITING/part/2', tone: 'cyan', icon: 'puzzle' }]
      },
      {
        title: 'Part 3: Chat 30-40 từ mỗi câu',
        description: 'Mỗi câu nên có ý chính, lý do và ví dụ ngắn. Dùng giọng thân thiện, tự nhiên.',
        actions: [{ label: 'Học Writing Part 3', to: '/app/tests/questions/WRITING/part/3', tone: 'amber', icon: 'clipboard' }]
      },
      {
        title: 'Part 4: Email thân mật và trang trọng',
        description: 'Phân biệt giọng viết cho bạn bè và người quản lý. Chú ý mở bài, thân bài, kết bài.',
        actions: [{ label: 'Học Writing Part 4', to: '/app/tests/questions/WRITING/part/4', tone: 'green', icon: 'lightbulb' }]
      }
    ]
  }
};

const writingLetterPdfUrl = '/docs/aptis-keys-meo-viet-thu.pdf';

export function Lessons() {
  const requireLogin = useRequireLogin();
  const { skillType, tipSlug } = useParams();
  const [activeSkill, setActiveSkill] = useState<SkillKey>('READING');
  const [resourceKind, setResourceKind] = useState<ResourceKind>('DOCUMENT');
  const [openResource, setOpenResource] = useState<LearningResource | null>(null);
  const selectedTipSkill = normalizeTipSkill(skillType);
  const current = useMemo(() => skillTips.find((item) => item.key === activeSkill) ?? skillTips[0], [activeSkill]);
  const { data: backendLessons } = useApi<Lesson[]>(() => unwrap(api.get(`/lessons?skill=${activeSkill}`)), [activeSkill]);
  const resources = useMemo(() => {
    return (backendLessons ?? [])
      .filter((lesson) => {
        if (lesson.status !== 'PUBLISHED') return false;
        const type = lesson.resourceType ?? 'TIP';
        return resourceKind === 'DOCUMENT' ? type === 'DOCUMENT' || type === 'TIP' : type === 'VIDEO';
      })
      .map(lessonToResource);
  }, [backendLessons, resourceKind]);

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

  if (selectedTipSkill === 'LISTENING' && tipSlug === 'cau-15') {
    return <ListeningQuestion15TipPage />;
  }

  if (selectedTipSkill) {
    return <TipLandingPage skill={selectedTipSkill} />;
  }

  return (
    <div className="space-y-6">
      <Link to="/app/tests" className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700 hover:text-brand-600">
        <ArrowLeft size={18} /> Quay lại luyện tập
      </Link>

      <section className="rounded-[28px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-6 text-white shadow-soft sm:p-8">
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
          <Link to="/app/renewal" className="btn-primary h-11 px-5">Gia hạn ngay</Link>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        {skillTips.map((skill) => (
          <button
            key={skill.key}
            type="button"
            onClick={() => setActiveSkill(skill.key)}
            className={`rounded-2xl border p-4 text-left shadow-soft transition ${
              activeSkill === skill.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-100 bg-white text-slate-700 hover:border-brand-200'
            }`}
          >
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-current">{skill.icon}</span>
            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-70">Kỹ năng</span>
            <span className="mt-1 block text-xl font-extrabold">{skill.label}</span>
          </button>
        ))}
      </section>

      <section className="rounded-[24px] border border-brand-100 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-brand-600">Kho học liệu {current.label}</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">Video và tài liệu ôn tập</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn loại học liệu để xem nhanh video hướng dẫn hoặc tài liệu tóm tắt theo kỹ năng đang chọn.
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-2xl border border-brand-100 bg-sky-50 p-1">
            {([
              { key: 'VIDEO', label: 'Video', icon: <PlayCircle size={17} /> },
              { key: 'DOCUMENT', label: 'Tài liệu', icon: <FileText size={17} /> }
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setResourceKind(item.key)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${
                  resourceKind === item.key ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-700 hover:bg-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {resources.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resources.map((resource) => (
              <ResourceCard key={resource.title} resource={resource} kind={resourceKind} onOpen={setOpenResource} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-brand-100 bg-sky-50 p-8 text-center">
            <p className="font-extrabold text-slate-700">Chưa có {resourceKind === 'VIDEO' ? 'video' : 'tài liệu'} cho {current.label}</p>
            <p className="mt-2 text-sm text-slate-600">Admin có thể thêm link trong mục Quản lý bài học.</p>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-brand-700">
              <Lightbulb size={15} /> Mẹo học
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-navy sm:text-3xl">{current.title}</h2>
            <p className="mt-2 max-w-3xl leading-7 text-slate-600">{current.subtitle}</p>
          </div>
          <Link to={current.practicePath} onClick={requireLogin} className="btn-secondary h-11 px-5">
            Vào luyện tập <ArrowRight size={18} />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {current.sections.map((section) => (
            <article key={section.title} className="overflow-hidden rounded-[20px] border border-brand-100 bg-sky-50">
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
                <Link to={`/app/lessons/${current.key}`} onClick={requireLogin} className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-600 px-4 text-sm font-extrabold text-brand-600 hover:bg-brand-50">
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
          items={['Đọc mẹo trước, làm 3-5 câu cùng dạng, rồi xem lại lỗi.', 'Ghi câu sai thành danh sách bẫy riêng.', 'Khi làm đề thi thử, chỉ kiểm tra đáp án ở cuối để giữ cảm giác thi thật.', 'Ôn lại mẹo trước ngày thi thay vì học thêm quá nhiều dạng mới.']}
        />
      </section>
      {openResource && <ResourceModal resource={openResource} onClose={() => setOpenResource(null)} />}
    </div>
  );
}

function TipLandingPage({ skill }: { skill: SkillKey }) {
  const requireLogin = useRequireLogin();
  const data = tipLanding[skill];
  const isWriting = skill === 'WRITING';

  return (
    <div className="mx-auto max-w-[1120px] bg-sky-50 pb-8 text-navy">
      <Link to="/app/lessons" className="mb-6 inline-flex items-center gap-2 text-sm font-extrabold text-slate-700 hover:text-brand-600">
        <ArrowLeft size={18} /> Quay lại thư viện mẹo
      </Link>

      <section className="rounded-[28px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-6 text-white shadow-soft sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-200">Mẹo thi Aptis</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{data.title}</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-blue-100 sm:text-base">
          Chọn một kỹ năng, sau đó học theo từng part/cụm câu để ôn đúng trọng tâm hơn.
        </p>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        {skillTips.map((item) => {
          const active = item.key === skill;

          return (
            <Link
              key={item.key}
              to={`/app/lessons/${item.key}`}
              className={`group rounded-2xl border p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift ${
                active ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-100 bg-white text-slate-700 hover:border-brand-200'
              }`}
            >
              <span className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${
                active ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100'
              }`}>
                {item.icon}
              </span>
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Kỹ năng</span>
              <span className="mt-1 block text-xl font-extrabold">{item.label}</span>
              <span className="mt-2 block text-xs font-bold opacity-75">{item.sections.length} nhóm mẹo</span>
            </Link>
          );
        })}
      </section>

      {isWriting && <WritingLetterPdfSection />}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {data.sections.map((section) => (
          <section key={section.title} className="flex h-full flex-col rounded-[24px] border border-brand-100 bg-white p-5 shadow-soft">
            <h2 className="text-2xl font-extrabold tracking-normal">{section.title}</h2>
            <p className="mt-4 flex-1 leading-7 text-slate-700">{section.description}</p>
            <div className={`mt-5 grid gap-3 ${section.actions.length > 1 ? 'xl:grid-cols-2' : ''}`}>
              {section.actions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  onClick={requireLogin}
                  className={`flex min-h-12 items-center justify-center gap-3 rounded-lg px-5 text-base font-extrabold transition hover:-translate-y-0.5 hover:shadow-lift ${tipActionTone(action.tone)}`}
                >
                  {tipActionIcon(action.icon)}
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function lessonToResource(lesson: Lesson): LearningResource {
  const type = lesson.resourceType ?? 'TIP';
  const resourceUrl = normalizeResourceUrl(lesson.resourceUrl);
  return {
    title: lesson.title,
    description: lesson.summary || lesson.content || lesson.title,
    content: lesson.content,
    meta: lesson.partLabel || (type === 'VIDEO' ? 'Video' : type === 'TIP' ? 'Mẹo học' : 'Tài liệu'),
    tags: [lesson.partLabel, type === 'VIDEO' ? 'Video' : type === 'TIP' ? 'Mẹo học' : 'Tài liệu', lesson.skill]
      .filter(Boolean)
      .map(String),
    href: resourceUrl,
    to: undefined
  };
}

function normalizeResourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ResourceCard({ resource, kind, onOpen }: { resource: LearningResource; kind: ResourceKind; onOpen: (resource: LearningResource) => void }) {
  const icon = kind === 'VIDEO' ? <PlayCircle size={52} /> : <FileText size={52} />;
  const actionText = kind === 'VIDEO' ? 'Xem video' : 'Mở tài liệu';

  const content = (
    <article className="group flex h-full min-h-[292px] flex-col overflow-hidden rounded-xl border border-brand-100 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
      <div className="relative grid min-h-[210px] flex-1 place-items-center bg-sky-50">
        <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-white">
          {resource.meta}
        </span>
        <div className={`grid h-28 w-28 place-items-center rounded-xl shadow-lift ${kind === 'VIDEO' ? 'bg-rose-500 text-white' : 'bg-brand-500 text-navy'}`}>
          {icon}
        </div>
      </div>
      <div className="border-t border-brand-100 px-4 py-4 text-center">
        <h3 className="line-clamp-2 min-h-11 text-base font-extrabold leading-6 text-navy">{resource.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{resource.description}</p>
        <span className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-extrabold text-brand-600">
          {actionText} <ArrowRight size={15} />
        </span>
      </div>
    </article>
  );

  if (resource.href) {
    return <a href={resource.href} target="_blank" rel="noreferrer">{content}</a>;
  }

  if (resource.to) {
    return <Link to={resource.to}>{content}</Link>;
  }

  return <button type="button" className="text-left" onClick={() => onOpen(resource)}>{content}</button>;
}

function ResourceModal({ resource, onClose }: { resource: LearningResource; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[linear-gradient(135deg,#06204a,#0057d9)]/45 p-0 sm:items-center sm:p-6">
      <div className="mx-auto max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">{resource.meta}</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">{resource.title}</h2>
            {resource.description && <p className="mt-2 text-sm leading-6 text-slate-600">{resource.description}</p>}
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-100 text-slate-600 hover:bg-sky-50" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-5">
          <div className="whitespace-pre-line rounded-2xl bg-sky-50 p-5 text-sm font-semibold leading-7 text-slate-700">
            {resource.content || resource.description || 'Chưa có nội dung tài liệu.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function WritingLetterPdfSection() {
  return (
    <section className="mt-10 space-y-5">
      <div className="overflow-hidden rounded-[24px] border border-brand-100 bg-white shadow-soft">
        <div className="grid gap-6 bg-white p-6 lg:grid-cols-[1fr_340px] lg:p-7">
          <div className="flex gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <PenLine size={26} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">Aptis Keys</p>
              <h2 className="mt-2 text-3xl font-extrabold text-navy">Mẹo viết thư</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Tài liệu này tổng hợp form mẫu, cách triển khai ý và ví dụ Book Club cho phần Writing Question 4.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a className="btn-primary h-11 px-5" href={writingLetterPdfUrl} target="_blank" rel="noreferrer">
                  Mở PDF
                </a>
                <a className="btn-secondary h-11 px-5" href={writingLetterPdfUrl} download>
                  Tải PDF
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="text-sm font-extrabold text-navy">Nên xem nhanh</p>
            <div className="mt-3 grid gap-2">
              {['Giới thiệu', 'Form mẫu', 'Ví dụ Book Club'].map((item) => (
                <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-700" key={item}>
                  <CheckCircle2 className="text-emerald-600" size={17} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-brand-100 bg-sky-50 px-4 py-4 sm:px-6">
          <div className="overflow-hidden rounded-[20px] border border-brand-100 bg-white shadow-soft">
            <div className="flex flex-col gap-3 border-b border-brand-100 bg-[#071426] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white">
                  <FileText size={19} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Xem tài liệu</p>
                  <p className="text-xs text-slate-300">PDF được nhúng trực tiếp trong trang</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a className="rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-navy hover:bg-sky-100" href={writingLetterPdfUrl} target="_blank" rel="noreferrer">Mở tab mới</a>
                <a className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-brand-700" href={writingLetterPdfUrl} download>Tải xuống</a>
              </div>
            </div>
            <div className="h-[72vh] min-h-[580px] bg-[#eef2f7] p-3">
              <object data={`${writingLetterPdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} type="application/pdf" className="h-full w-full rounded-xl bg-white">
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="font-semibold text-slate-700">Trình duyệt không hiển thị được PDF trong trang.</p>
                  <a className="btn-primary" href={writingLetterPdfUrl} target="_blank" rel="noreferrer">Mở PDF</a>
                </div>
              </object>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type ListeningQ15Variant = {
  speaker?: 'Nam' | 'Nữ';
  key: string;
  note: string;
  warning?: string;
  badge?: string;
};

type ListeningQ15Topic = {
  no: number;
  topic: string;
  subtitle: string;
  variants: ListeningQ15Variant[];
};

const listeningQ15Topics: ListeningQ15Topic[] = [
  {
    no: 1,
    topic: 'Politics',
    subtitle: 'Chính trị',
    variants: [
      { speaker: 'Nam', key: 'B - M - W - B', note: 'Cả đàn ông (M) và phụ nữ (W) đều (B) phải tôn trọng pháp luật.' },
      { speaker: 'Nữ', key: 'B - W - M - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 2,
    topic: 'IT & Tech',
    subtitle: 'Thông tin & Công nghệ',
    variants: [
      { speaker: 'Nam', key: 'M - M - W - B', note: 'Đàn ông (M) chê phụ nữ (W) kém công nghệ, nhưng phụ nữ (W) nghĩ cả 2 (B) đều giỏi.' },
      { speaker: 'Nữ', key: 'W - M - M - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 3,
    topic: 'Arts',
    subtitle: 'Nghệ thuật',
    variants: [
      { speaker: 'Nam', key: 'M - W - B - W', note: 'Chàng trai (M) và cô gái (W) cùng nhau (B) nhảy múa, nhưng cô gái (W) rời đi khi trời tối còn rất trẻ.' },
      { speaker: 'Nữ', key: 'W - M - B - M', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 4,
    topic: 'Music',
    subtitle: 'Âm nhạc & Ca sĩ',
    variants: [
      { speaker: 'Nam', key: 'M - B - W - B', note: 'Đàn ông (M) thích cả (B) âm nhạc và ca sĩ. Phụ nữ (W) cũng thích cả (B) âm nhạc và ca sĩ.' },
      { speaker: 'Nữ', key: 'W - B - M - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 5,
    topic: 'University',
    subtitle: 'Trường đại học',
    variants: [
      { speaker: 'Nam', key: 'B - W - M - W', note: 'Bố (M) đưa con gái (W) đi học, nhưng đến trường thì người yêu (M) đưa con gái (W) đi chơi.' },
      { speaker: 'Nữ', key: 'B - M - W - M', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 6,
    topic: 'Urban Farming',
    subtitle: 'Nông nghiệp đô thị',
    variants: [
      { speaker: 'Nam', key: 'W - B - M - B', note: 'Phụ nữ (W) nói cả (B) đàn ông (M) và phụ nữ đều (B) phải làm ruộng.' },
      { speaker: 'Nữ', key: 'M - B - W - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 7,
    topic: 'Local Center',
    subtitle: 'Trung tâm cộng đồng',
    variants: [
      { speaker: 'Nam', key: 'M - B - W - W', note: 'Mẹ (M) bảo (B) Win (W) tìm em gái (W) ở trung tâm cộng đồng.' },
      { speaker: 'Nữ', key: 'W - B - M - M', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 8,
    topic: 'Design',
    subtitle: 'Thiết kế cộng đồng',
    variants: [
      { speaker: 'Nam', key: 'B - W - M - B', note: 'Bố (B) Win (W) muốn (M) bàn (B) về thiết kế nhà.' },
      { speaker: 'Nữ', key: 'B - M - W - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 9,
    topic: 'Beauty',
    subtitle: 'Sắc đẹp',
    variants: [
      { speaker: 'Nữ', key: 'M - W - B - W', warning: 'Chỉ có phiên bản giọng Nữ.', note: 'Chàng trai (M) đưa cô gái (W) đi làm đẹp, cuối cùng thì hai (B) bị bà chủ tiệm (W) lừa bán sang.' }
    ]
  },
  {
    no: 10,
    topic: 'Workplace',
    subtitle: 'Nơi làm việc',
    variants: [
      { speaker: 'Nữ', key: 'M - W - B - M', warning: 'Chỉ có phiên bản giọng Nữ.', note: 'Mẹo: Người đàn ông (M) bảo người phụ nữ (W) làm cả hai (B) nghề nên người đàn ông (M) bỏ đi.' }
    ]
  },
  {
    no: 11,
    topic: 'Actor',
    subtitle: 'Diễn viên',
    variants: [
      { key: 'M - W - B - B', note: 'Mẹo: Mở Win Bữa Bạn (MWBB). Cả nam hoặc nữ có thể nói trước.', badge: 'Do có nhiều phiên bản nên chọn MWBB' }
    ]
  },
  {
    no: 12,
    topic: 'Internet',
    subtitle: 'Mạng Internet',
    variants: [
      { key: 'B - W - B - B', note: 'Mẹo: "Bố Win Bữa Bạn" (BWBB). Cả nam hoặc nữ nói trước.', badge: 'Do có nhiều phiên bản nên chọn BWBB' }
    ]
  },
  {
    no: 13,
    topic: 'Homeschooling',
    subtitle: 'Học tại nhà',
    variants: [
      { speaker: 'Nam', key: 'M - M - W - B', note: 'Mình (M) vẫn (W) viết (W) bài (B) cho trường học.' },
      { speaker: 'Nữ', key: 'W - M - M - B', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 14,
    topic: 'Children and Teenagers with Technology',
    subtitle: 'Trẻ em và thanh thiếu niên với công nghệ',
    variants: [
      { speaker: 'Nam', key: 'B - B - M - W', note: 'Công nghệ biến (B) bạn (B) mẹ (M) Web (W).' },
      { speaker: 'Nữ', key: 'B - B - W - M', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 15,
    topic: 'Environmental volunteer program',
    subtitle: 'Chương trình tình nguyện môi trường',
    variants: [
      { speaker: 'Nam', key: 'B - M - W - M', note: 'Bố (B) muốn (M) con gái (W) và con trai (M) tham gia chương trình tình nguyện môi trường.' },
      { speaker: 'Nữ', key: 'B - W - M - W', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 16,
    topic: 'Local Culture different',
    subtitle: 'Văn hóa địa phương khác biệt',
    variants: [
      { speaker: 'Nam', key: 'M - B - W - W', note: 'Đàn ông (M) không nên bắt (B) hai phụ nữ (WW) phải giống nhau khi văn hóa của họ không giống nhau.' },
      { speaker: 'Nữ', key: 'W - B - M - M', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  },
  {
    no: 17,
    topic: 'Work Business / Business and Cultural',
    subtitle: 'Kinh doanh & Văn hóa công sở',
    variants: [
      { speaker: 'Nam', key: 'W - B - M - M', note: 'Một phụ nữ (W) và (B) hai người đàn ông (M) cùng khởi nghiệp kinh doanh.' },
      { speaker: 'Nữ', key: 'M - B - W - W', note: 'Đảo vị trí M và W ở câu trên.' }
    ]
  }
];

function ListeningQuestion15TipPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-5 pb-8">
      <Link to="/app/lessons/LISTENING" className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700 hover:text-brand-600">
        <ArrowLeft size={18} /> Quay lại mẹo Listening
      </Link>

      <section className="rounded-xl border border-sky-100 bg-sky-50 px-5 py-4 text-blue-950">
        <div className="flex gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 font-black text-white">i</span>
          <p className="leading-7">
            <b>Hướng dẫn học nhanh:</b> Hãy chú ý giọng đọc đầu tiên (Nam hay Nữ) để chọn dãy đáp án phù hợp.
            Các ký tự <ListeningCode value="B" /> <ListeningCode value="M" /> <ListeningCode value="W" /> đại diện cho Both, Man, Woman.
          </p>
        </div>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left">
            <thead className="bg-white text-[13px] uppercase text-slate-500">
              <tr>
                <th className="w-14 border-b border-slate-200 px-4 py-3">#</th>
                <th className="w-[240px] border-b border-slate-200 px-4 py-3">Topic</th>
                <th className="w-[130px] border-b border-slate-200 px-4 py-3 text-center">Giọng</th>
                <th className="w-[220px] border-b border-slate-200 px-4 py-3 text-center">Key</th>
                <th className="border-b border-slate-200 px-4 py-3">Mẹo nhớ</th>
              </tr>
            </thead>
            <tbody>
              {listeningQ15Topics.map((topic) =>
                topic.variants.map((variant, index) => (
                  <tr className="border-t border-slate-200 bg-white" key={`${topic.no}-${variant.key}-${index}`}>
                    {index === 0 && (
                      <>
                        <td rowSpan={topic.variants.length} className="bg-white px-4 py-5 align-middle text-base font-extrabold text-slate-700">{topic.no}</td>
                        <td rowSpan={topic.variants.length} className="bg-white px-4 py-5 align-middle">
                          <p className="font-extrabold text-slate-950">{topic.topic}</p>
                          <p className="mt-1 text-sm text-slate-500">{topic.subtitle}</p>
                        </td>
                      </>
                    )}
                    <td className="bg-[#fbf8ff] px-4 py-3 text-center">{variant.speaker ? <SpeakerBadge speaker={variant.speaker} /> : null}</td>
                    <td className="bg-[#fff8f8] px-4 py-3 text-center"><KeyBadge value={variant.key} highlight={!variant.speaker} /></td>
                    <td className="px-4 py-3 text-sm leading-6">
                      {variant.warning && <p className="mb-1 font-extrabold text-red-500">{variant.warning}</p>}
                      <p className={index > 0 ? 'italic text-slate-600' : 'text-slate-800'}>{variant.note}</p>
                      {variant.badge && <span className="mt-2 inline-flex rounded bg-emerald-700 px-2 py-1 text-xs font-extrabold text-white">{variant.badge}</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ListeningCode({ value }: { value: string }) {
  return <span className="mx-1 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-600 px-1.5 text-xs font-black text-white">{value}</span>;
}

function SpeakerBadge({ speaker }: { speaker: 'Nam' | 'Nữ' }) {
  const isMale = speaker === 'Nam';
  return (
    <span className={`inline-flex min-w-16 items-center justify-center rounded-full border px-3 py-1 text-xs font-extrabold ${isMale ? 'border-sky-200 bg-sky-100 text-sky-700' : 'border-pink-200 bg-pink-100 text-pink-600'}`}>
      {speaker}
    </span>
  );
}

function KeyBadge({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex min-w-[160px] justify-center rounded-sm px-3 py-2 font-mono text-xs font-black tracking-[0.2em] ${highlight ? 'bg-amber-100 text-navy' : 'bg-red-50 text-red-500'}`}>
      {value}
    </span>
  );
}

function normalizeTipSkill(value?: string): SkillKey | '' {
  const upper = value?.toUpperCase();
  return upper === 'LISTENING' || upper === 'READING' || upper === 'SPEAKING' || upper === 'WRITING' ? upper : '';
}

function tipActionTone(tone: TipAction['tone']) {
  if (tone === 'blue') return 'bg-blue-600 text-white';
  if (tone === 'cyan') return 'bg-cyan-500 text-navy';
  if (tone === 'green') return 'bg-emerald-700 text-white';
  if (tone === 'amber') return 'bg-amber-400 text-navy';
  return 'bg-red-600 text-white';
}

function tipActionIcon(icon: TipAction['icon']) {
  if (icon === 'book') return <BookOpen size={22} />;
  if (icon === 'puzzle') return <Puzzle size={22} />;
  if (icon === 'clipboard') return <ClipboardCheck size={22} />;
  return <Lightbulb size={22} />;
}

function MaterialCard({ icon, title, items }: { icon: JSX.Element; title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div>
        <h2 className="text-xl font-extrabold text-navy">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div className="flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-sm font-semibold leading-6 text-slate-700" key={item}>
            <FileText className="mt-0.5 shrink-0 text-brand-600" size={18} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}


