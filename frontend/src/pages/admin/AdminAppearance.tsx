import { Check, Moon, PartyPopper, Sparkles, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, publicApi, unwrap } from '../../api/client';
import type { StudentSkin, UiSettings } from '../../types';

const skinOptions: Array<{
  value: StudentSkin;
  label: string;
  description: string;
  icon: LucideIcon;
  preview: string;
  chips: string[];
}> = [
  {
    value: 'default',
    label: 'Mặc định',
    description: 'Giao diện Aptis Lingo hiện tại, sạch và tập trung cho học hằng ngày.',
    icon: Sun,
    preview: 'bg-[linear-gradient(135deg,#fff8f2,#ffffff)]',
    chips: ['#dc1620', '#ffd84d', '#06204a']
  },
  {
    value: 'halloween',
    label: 'Halloween',
    description: 'Tông tím than, cam bí ngô và điểm nhấn nổi bật cho chiến dịch tháng 10.',
    icon: Moon,
    preview: 'bg-[radial-gradient(circle_at_16%_12%,rgba(249,115,22,.55),transparent_22%),radial-gradient(circle_at_84%_22%,rgba(168,85,247,.45),transparent_24%),linear-gradient(135deg,#100719,#251038_54%,#3a1327)]',
    chips: ['#ff6b00', '#a855f7', '#fde68a']
  },
  {
    value: 'mid_autumn',
    label: 'Trung thu',
    description: 'Tông trăng vàng, đỏ lồng đèn và xanh ngọc nhẹ cho mùa Trung thu.',
    icon: Sparkles,
    preview: 'bg-[linear-gradient(135deg,#fff4c2,#f97316_52%,#0f766e)]',
    chips: ['#facc15', '#ef4444', '#0f766e']
  },
  {
    value: 'tet',
    label: 'Tết',
    description: 'Tông đỏ may mắn, vàng kim và nền ấm cho chiến dịch Tết.',
    icon: PartyPopper,
    preview: 'bg-[linear-gradient(135deg,#b91c1c,#ef4444_52%,#facc15)]',
    chips: ['#dc2626', '#facc15', '#15803d']
  }
];

export function AdminAppearance() {
  const [selectedSkin, setSelectedSkin] = useState<StudentSkin>('default');
  const [savedSkin, setSavedSkin] = useState<StudentSkin>('default');
  const [studentTheme, setStudentTheme] = useState<UiSettings['studentTheme']>('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    unwrap<UiSettings>(publicApi.get('/ui-settings'))
      .then((settings) => {
        if (!mounted) return;
        setSelectedSkin(settings.studentSkin ?? 'default');
        setSavedSkin(settings.studentSkin ?? 'default');
        setStudentTheme(settings.studentTheme ?? 'dark');
      })
      .catch((error) => toast.error(errorMessage(error, 'Không tải được cấu hình giao diện.')))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const settings = await unwrap<UiSettings>(api.put('/ui-settings', {
        studentTheme,
        studentSkin: selectedSkin
      }));
      setSelectedSkin(settings.studentSkin ?? 'default');
      setSavedSkin(settings.studentSkin ?? 'default');
      setStudentTheme(settings.studentTheme ?? 'dark');
      toast.success('Đã lưu skin giao diện cho học viên.');
    } catch (error) {
      toast.error(errorMessage(error, 'Không lưu được cấu hình giao diện.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[22px] bg-[linear-gradient(135deg,#06204a,#0057d9)] p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Admin</p>
        <h1 className="mt-3 text-3xl font-extrabold">Giao diện theo mùa</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Chọn skin áp dụng cho khu vực học viên như Halloween, Trung thu hoặc Tết. Chế độ sáng/tối vẫn để học viên tự chỉnh trong tài khoản của họ.
        </p>
      </section>

      <section className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 border-b border-brand-100 pb-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-extrabold text-navy">Skin học viên</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Đang áp dụng: <span className="font-extrabold text-brand-700">{labelForSkin(savedSkin)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || selectedSkin === savedSkin}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? 'Đang lưu...' : 'Lưu skin'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {skinOptions.map((option) => {
            const Icon = option.icon;
            const active = selectedSkin === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedSkin(option.value)}
                className={`group rounded-[18px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift ${
                  active ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:border-brand-200'
                }`}
              >
                <div className={`relative mb-4 h-32 overflow-hidden rounded-2xl border border-white/50 p-4 shadow-soft ${option.preview}`}>
                  {option.value === 'halloween' && (
                    <>
                      <span className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:22px_22px]" />
                      <span className="absolute right-4 top-3 rounded-full border border-orange-300/60 bg-orange-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-orange-100">Halloween</span>
                      <span className="absolute bottom-5 right-7 h-8 w-8 rounded-full border border-violet-200/30 bg-transparent shadow-[0_0_30px_rgba(250,204,21,.35)]" />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="h-9 w-9 rounded-xl bg-white/90 shadow-soft" />
                    <span className="h-3 w-20 rounded-full bg-white/60" />
                  </div>
                  <div className="mt-8 h-4 w-32 rounded-full bg-white/75" />
                  <div className="mt-3 flex gap-2">
                    {option.chips.map((color) => (
                      <span key={color} className="h-5 w-5 rounded-full border border-white/80" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700 shadow-soft">
                      <Icon size={19} />
                    </span>
                    <div>
                      <h3 className="text-lg font-extrabold text-navy">{option.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                    </div>
                  </div>
                  {active && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                      <Check size={16} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function labelForSkin(skin: StudentSkin) {
  if (skin === 'halloween') return 'Halloween';
  if (skin === 'mid_autumn') return 'Trung thu';
  if (skin === 'tet') return 'Tết';
  return 'Mặc định';
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
