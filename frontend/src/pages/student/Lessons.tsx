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
    title: 'Meo hoc cac cau phan Listening',
    subtitle: 'Hoc theo nhom cau de biet phan nao can nghe ky, phan nao co the an diem nhanh.',
    icon: <Headphones size={22} />,
    practicePath: '/app/tests/questions/LISTENING',
    sections: [
      {
        title: 'Cau 1-13: Nhom de an diem nhat',
        description: 'Thuong hoi thong tin ngan nhu do vat, thoi gian, dia diem, hoat dong. Luyen du dang se nhan ra dap an rat nhanh.',
        color: 'bg-brand-600 text-white',
        button: 'Hoc cau 1-13',
        points: ['Doc cau hoi truoc khi nghe de bat keyword.', 'Chu y tu dong nghia vi audio thuong khong doc y nguyen dap an.', 'Neu lo mot cau, bo qua ngay de giu nhip cho cau tiep theo.']
      },
      {
        title: 'Cau 14: Cau kho nhat trong Listening',
        description: 'Co nhieu dap an gay nhieu. Hay nghe quan diem chinh cua tung nguoi thay vi chi bam vao mot tu khoa.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Hoc cau 14',
        points: ['Ghi nhanh ten nguoi hoac thu tu nguoi noi.', 'Loai dap an xuat hien nhung bi phu dinh.', 'Neu thieu thoi gian, hoc chac cac mau dap an hay gap.']
      },
      {
        title: 'Cau 15: Nhom tuong doi de hoc',
        description: 'Thuong la dang noi nguoi voi y kien hoac thong tin. Can phan biet ai dang noi va thai do cua ho.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Hoc cau 15',
        points: ['Tap nghe cac tu bao hieu y kien: think, prefer, agree, worried.', 'Khong chon theo tu don le, hay chon theo y chinh.', 'Ghi lai cac cum dong nghia sau moi bai.']
      },
      {
        title: 'Cau 16 & 17: Hai cau cuoi de mat diem neu voi',
        description: 'Can nghe y tong quat va tranh nham giua chi tiet phu voi ket luan cua nguoi noi.',
        color: 'bg-emerald-700 text-white',
        button: 'Hoc cau 16 & 17',
        points: ['Lan mot nghe chu de, lan hai khoa dap an.', 'Uu tien dap an khop voi ket luan cuoi.', 'Can than bay doi thoi gian, doi nguoi, doi ly do.']
      }
    ]
  },
  {
    key: 'READING',
    label: 'Reading',
    title: 'Meo hoc cac cau phan Reading',
    subtitle: 'Chia Reading theo tung part: dien tu, sap xep cau, doc forum va noi tieu de.',
    icon: <BookOpen size={22} />,
    practicePath: '/app/tests/questions/READING',
    sections: [
      {
        title: 'Part 1: Cau hoi dau tien',
        description: 'Dang dien tu vao doan ngan. Diem nam o ngu phap co ban va cum tu quen thuoc.',
        color: 'bg-brand-600 text-white',
        button: 'Hoc cau 1',
        points: ['Doc ca cau truoc va sau o trong.', 'Kiem tra loai tu can dien: danh tu, dong tu, tinh tu.', 'Chon tu lam cau tu nhien nhat, dung thi va dung ngu canh.']
      },
      {
        title: 'Part 2 & 3: Sap xep cau',
        description: 'Can tim cau mo dau, cau noi y va cau ket. Dung dau hieu lien ket de xep thu tu.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Hoc cau 2 & 3',
        points: ['Tim cau tong quan truoc.', 'De y dai tu this, that, they va tu noi however, because, after that.', 'Doc lai ca doan sau khi sap xep de kiem tra mach van.']
      },
      {
        title: 'Part 4: Doc y kien bon nguoi',
        description: 'Doc nhanh tung nguoi A, B, C, D va gan keyword rieng cho moi nguoi.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Hoc cau 4',
        points: ['Gach y chinh cua tung nguoi.', 'Cau hoi hay dung tu dong nghia, khong phai tu y nguyen.', 'Neu phan van, chon nguoi co y gan nhat voi ca cau hoi.']
      },
      {
        title: 'Part 5: Noi tieu de voi doan',
        description: 'Khong can dich tung tu. Hay tim keyword va y chinh cua moi doan.',
        color: 'bg-emerald-700 text-white',
        button: 'Meo hoc nhanh Part 5',
        points: ['Doc danh sach tieu de truoc.', 'Doc cau dau va cau cuoi cua moi doan.', 'Loai tieu de qua chi tiet hoac chi dung voi mot vi du nho.']
      }
    ]
  },
  {
    key: 'SPEAKING',
    label: 'Speaking',
    title: 'Meo hoc cac cau phan Speaking',
    subtitle: 'Tap tra loi ngan gon, dung trong tam va co cau truc de noi tu nhien hon.',
    icon: <Mic size={22} />,
    practicePath: '/app/tests/questions/SPEAKING',
    sections: [
      {
        title: 'Part 1: Thong tin ban than',
        description: 'Gom cac cau hoi quen thuoc ve gia dinh, ban be, so thich, que huong, thoi tiet.',
        color: 'bg-brand-600 text-white',
        button: 'Hoc cau 1',
        points: ['Tra loi 2-3 cau ngan, ro y.', 'Dung vi du ca nhan de cau tra loi tu nhien.', 'Khong hoc thuoc qua dai vi de bi quen.']
      },
      {
        title: 'Part 2: Mo ta 1 hinh anh va 2 cau hoi phu',
        description: 'Can mo ta anh truoc, sau do tra loi them hai cau lien quan den chu de.',
        color: 'bg-emerald-700 text-white',
        button: 'Meo hoc nhanh Part 2',
        points: ['Noi vi tri, hanh dong, cam xuc va boi canh trong anh.', 'Tra loi du ba cau, khong bo sot cau phu.', 'Dung tu noi don gian: firstly, also, because, in my opinion.']
      },
      {
        title: 'Part 3: So sanh hai hinh anh',
        description: 'Mo ta hai anh, so sanh diem giong/khac va dua ra y kien.',
        color: 'bg-rose-600 text-white',
        button: 'Hoc cau 3',
        points: ['Dung mau: In the first picture..., while in the second picture...', 'Neu hinh kho, tap trung vao boi canh va cam xuc.', 'Nen co mot cau ket ve y kien ca nhan.']
      },
      {
        title: 'Part 4: Ke ve mot trai nghiem',
        description: 'Thuong hoi ve mot lan ban lam gi do trong qua khu. Can co cau chuyen ngan, ly do va bai hoc.',
        color: 'bg-emerald-700 text-white',
        button: 'Hoc cau 4',
        points: ['Dung cau truc: situation - action - result - feeling.', 'Dung thi qua khu neu ke chuyen cu.', 'Chuan bi san cac mau ve money, book, sport, team, good news.']
      }
    ]
  },
  {
    key: 'WRITING',
    label: 'Writing',
    title: 'Meo viet thu va tra loi Writing',
    subtitle: 'Tong hop meo viet form, chat va email theo tung phan cua Aptis Writing.',
    icon: <PenLine size={22} />,
    practicePath: '/app/tests/questions/WRITING',
    sections: [
      {
        title: 'Part 1: Form ngan 1-5 tu',
        description: 'Tra loi ngan, dung thong tin va dung chinh ta. Khong viet cau dai.',
        color: 'bg-brand-600 text-white',
        button: 'Hoc Writing Part 1',
        points: ['Viet hoa ten rieng, quoc gia, thanh pho.', 'Neu hoi so thich, tra loi bang cum ngan: reading books, playing football.', 'Kiem tra spelling truoc khi sang cau tiep.']
      },
      {
        title: 'Part 2: Form 20-30 tu',
        description: 'Viet 2-3 cau hoan chinh, tra loi truc tiep dung yeu cau cua de.',
        color: 'bg-cyan-500 text-slate-950',
        button: 'Hoc Writing Part 2',
        points: ['Mo dau bang cau tra loi truc tiep.', 'Them mot ly do hoac vi du nho.', 'Can dem tu, thieu qua hoac dai qua deu mat diem.']
      },
      {
        title: 'Part 3: Chat 30-40 tu moi cau',
        description: 'Tra loi tung tin nhan theo giong than thien, co ly do va goi y ro rang.',
        color: 'bg-amber-400 text-slate-950',
        button: 'Hoc Writing Part 3',
        points: ['Moi cau nen co y chinh + ly do + vi du ngan.', 'Dung cau noi tu nhien: I think, For example, Maybe you should.', 'Khong lap mot cau truc qua nhieu lan.']
      },
      {
        title: 'Part 4: Email than mat va trang trong',
        description: 'Viet hai email: mot email ngan cho ban va mot email dai, lich su hon cho nguoi quan ly hoac chu tich.',
        color: 'bg-emerald-700 text-white',
        button: 'Hoc Writing Part 4',
        points: ['Email cho ban: than mat, tu nhien, co cam xuc.', 'Email trang trong: Dear..., I am writing to..., I would like to...', 'Ket thu bang Best wishes hoac Yours sincerely tuy ngu canh.']
      }
    ]
  }
];

export function Lessons() {
  const [activeSkill, setActiveSkill] = useState<SkillKey>('READING');
  const current = useMemo(() => skillTips.find((item) => item.key === activeSkill) ?? skillTips[0], [activeSkill]);

  const { data: subscription } = useApi<SubscriptionResponse | null>(
    () => unwrap<SubscriptionResponse>(api.get('/subscriptions/me')).catch(() => null),
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
        <ArrowLeft size={18} /> Quay lai luyen tap
      </Link>

      <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-200">Thu vien meo Aptis</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-5xl">Hoc meo theo tung ky nang</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              Chon Listening, Reading, Speaking hoac Writing de xem cac meo on thi ngan gon, dung trong tam.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-300" />
              <div>
                <p className="font-extrabold">Aptis Pro Access</p>
                <p className="text-sm text-slate-300">{hasAccess ? `Con han den ${formatSubscriptionDate(expireDate)}` : 'Can gia han de hoc day du'}</p>
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
              <h2 className="font-extrabold">Tai khoan da het han hoc</h2>
              <p className="text-sm">Ban van xem duoc danh sach meo, nhung can gia han de vao bai luyen day du.</p>
            </div>
          </div>
          <Link to="/app/renew" className="btn-primary h-11 px-5">Gia han ngay</Link>
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
            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-70">Ky nang</span>
            <span className="mt-1 block text-xl font-extrabold">{skill.label}</span>
          </button>
        ))}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-brand-700">
              <Lightbulb size={15} /> Meo hoc
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950 sm:text-3xl">{current.title}</h2>
            <p className="mt-2 max-w-3xl leading-7 text-slate-500">{current.subtitle}</p>
          </div>
          <Link to={current.practicePath} className="btn-secondary h-11 px-5">
            Vao luyen tap <ArrowRight size={18} />
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
          title="Checklist Writing truoc khi nop"
          items={['Dung so tu yeu cau cua tung part.', 'Co mo bai, than bai va ket bai ro neu la email.', 'Dung giong than mat cho ban be, trang trong cho nguoi quan ly.', 'Kiem tra thi dong tu, dau cau, viet hoa va chinh ta.']}
        />
        <MaterialCard
          icon={<FileText />}
          title="Cach hoc meo hieu qua"
          items={['Doc meo truoc, lam 3-5 cau cung dang, roi xem lai loi.', 'Ghi cau sai thanh danh sach bay rieng.', 'Khi lam bo de, chi kiem tra dap an o cuoi de giu cam giac thi that.', 'On lai meo truoc ngay thi thay vi hoc them qua nhieu dang moi.']}
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
