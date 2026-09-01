import { CreditCard, HeartHandshake, Mail, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const donateQrUrl = 'https://img.vietqr.io/image/TPB-86891604205-compact2.png?accountName=BUI%20MINH%20DIEN';
const bankName = 'TPBank';
const accountName = 'BUI MINH DIEN';
const accountNumber = '86891604205';

export function Donate() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="overflow-hidden rounded-[28px] border border-brand-100 bg-white shadow-soft">
        <div className="bg-[linear-gradient(135deg,#06204a,#0057d9)] px-6 py-7 text-center text-white sm:px-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-emerald-200">
            <HeartHandshake size={28} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Ủng hộ web</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300">
            Quét mã QR bên dưới để ủng hộ Aptis Keys duy trì và cập nhật thêm tài liệu mới.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-8">
          <div className="mx-auto max-w-sm rounded-[24px] border border-brand-100 bg-sky-50 p-5 text-center">
            <div className="rounded-[20px] bg-white p-4 shadow-soft">
              <img
                src={donateQrUrl}
                alt="Mã QR donate TPBank BUI MINH DIEN"
                className="mx-auto aspect-square w-full max-w-[300px] rounded-2xl object-contain"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-left shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{bankName}</p>
                  <p className="font-extrabold text-navy">{accountName}</p>
                  <p className="text-sm font-semibold text-slate-700">{accountNumber}</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">Cảm ơn bạn đã ủng hộ web.</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/app/contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white text-sm font-extrabold text-navy hover:bg-sky-50">
              <Mail size={18} />
              Liên hệ admin
            </Link>
            <Link to="/app/renewal" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-extrabold text-white hover:bg-emerald-700">
              <RefreshCw size={18} />
              Gia hạn gói học
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
