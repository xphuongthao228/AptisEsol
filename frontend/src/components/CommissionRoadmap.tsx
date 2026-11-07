import { Star } from 'lucide-react';
import './commission-roadmap.css';

export function CommissionRoadmap({ referredBuyers }: { referredBuyers: number | null }) {
  return <section className="commission-roadmap" aria-labelledby="commission-tiers-title">
    <div className="commission-roadmap-heading">
      <span className="commission-roadmap-star"><Star size={30} strokeWidth={2.7} /></span>
      <div><h2 id="commission-tiers-title">Mức hoa hồng của bạn</h2>
        <p>Càng nhiều bạn mua gói qua mã của bạn, mức hoa hồng càng tăng.</p></div>
    </div>
    <div className="commission-roadmap-track">
      <svg className="commission-roadmap-scene" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="commission-road-pink" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffb6cf" /><stop offset=".5" stopColor="#ffcfdf" /><stop offset="1" stopColor="#ffaac9" /></linearGradient>
          <linearGradient id="commission-leaf" x2="0" y2="1"><stop stopColor="#d5f49e" /><stop offset="1" stopColor="#7cbd4c" /></linearGradient>
          <linearGradient id="commission-flag"><stop stopColor="#ff8c9e" /><stop offset="1" stopColor="#ff3e65" /></linearGradient>
        </defs>
        <g fill="url(#commission-leaf)">
          <circle cx="36" cy="122" r="20" /><circle cx="59" cy="106" r="26" /><circle cx="88" cy="119" r="19" />
          <circle cx="902" cy="76" r="18" /><circle cx="925" cy="62" r="24" /><circle cx="950" cy="77" r="20" />
        </g>
        <path d="M923 78 L925 5" stroke="#ffd268" strokeWidth="7" strokeLinecap="round" />
        <path d="M929 6 C950 -7 961 25 978 12 L972 39 C953 49 945 20 928 32Z" fill="url(#commission-flag)" />
        <path d="M26 153 C150 87 234 207 337 166 S459 69 568 121 S681 201 790 159 S917 85 976 110" fill="none" stroke="#fff7fb" strokeWidth="40" strokeLinecap="round" />
        <path d="M26 153 C150 87 234 207 337 166 S459 69 568 121 S681 201 790 159 S917 85 976 110" fill="none" stroke="url(#commission-road-pink)" strokeWidth="34" strokeLinecap="round" />
        <path d="M26 153 C150 87 234 207 337 166 S459 69 568 121 S681 201 790 159 S917 85 976 110" fill="none" stroke="#fff8fb" strokeWidth="4" strokeDasharray="12 19" strokeLinecap="round" />
        {[{ x: 62, y: 121 }, { x: 368, y: 131 }, { x: 683, y: 155 }, { x: 905, y: 77 }].map(({ x, y }) => <g key={x} transform={`translate(${x} ${y})`}>
          <ellipse cx="-9" cy="5" rx="5" ry="10" fill="#8acb60" transform="rotate(-35)" />
          {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cy="-5" rx="3.5" ry="5" fill="#ffb3c7" transform={`rotate(${angle})`} />)}
          <circle r="3" fill="#fff5ac" />
        </g>)}
      </svg>
      {[
        { range: '0–7', percent: '5%' },
        { range: '7–14', percent: '10%' },
        { range: '14–20', percent: '15%' },
      ].map(({ range, percent }, index) => <div key={range} className={`commission-roadmap-stop commission-roadmap-stop-${index}`}>
        <div className="commission-roadmap-badge"><span aria-hidden="true" className="commission-roadmap-sparks" />{percent}</div>
        <p>{range} bạn mua</p>
      </div>)}
    </div>
    <p className="commission-roadmap-count" aria-live="polite">
      {referredBuyers === null ? 'Chưa tải được số người giới thiệu.' : <>Bạn đã giới thiệu thành công <strong>{new Intl.NumberFormat('vi-VN').format(referredBuyers)} người</strong></>}
    </p>
  </section>;
}
