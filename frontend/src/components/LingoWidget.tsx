import { FormEvent, ReactNode, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, ExternalLink, MessageCircle, Send, Sparkles, UserRound, Users, X } from 'lucide-react';
import { api, unwrap } from '../api/client';

const facebookCommunityUrl = 'https://www.facebook.com/groups/1017783430680359';
const zaloCommunityUrl = 'https://zalo.me/g/n1f3m9mamomr1vnhs6lw';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function LingoWidget() {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Chào bạn, mình là Lingo. Bạn muốn hỏi gì về Aptis hôm nay?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await unwrap<{ reply: string }>(api.post('/ai/lingo/chat', {
        message,
        history: messages.slice(-10)
      }));
      setMessages([...nextMessages, { role: 'assistant', content: result.reply }]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Lingo đang tạm bận. Bạn thử lại sau ít phút nhé.';
      toast.error(message);
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <div className="fixed bottom-24 left-5 z-[80]">
      {contactOpen && (
        <section className="mb-3 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl shadow-slate-900/18">
          <header className="flex h-16 items-center justify-between bg-gradient-to-r from-brand-700 to-sky-500 px-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/18">
                <Users size={22} />
              </div>
              <div>
                <h2 className="text-base font-extrabold">Liên hệ admin</h2>
                <p className="text-xs font-semibold text-white/80">Group học chung & hỗ trợ nhanh</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/14 hover:bg-white/24"
              aria-label="Đóng liên hệ admin"
            >
              <X size={18} />
            </button>
          </header>

          <div className="space-y-3 bg-sky-50 p-4">
            <a href={facebookCommunityUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-navy shadow-soft transition hover:-translate-y-0.5 hover:text-brand-700">
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1877f2] text-white">
                  <Users size={17} />
                </span>
                Group Facebook
              </span>
              <ExternalLink size={16} />
            </a>
            <a href={zaloCommunityUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-navy shadow-soft transition hover:-translate-y-0.5 hover:text-brand-700">
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0068ff] text-white">
                  <MessageCircle size={17} />
                </span>
                Nhóm Zalo
              </span>
              <ExternalLink size={16} />
            </a>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setContactOpen((value) => !value);
          setOpen(false);
        }}
        className="group relative grid h-[62px] w-[62px] place-items-center rounded-full bg-white shadow-xl shadow-slate-900/20 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-2xl"
        aria-label="Mở liên hệ admin"
      >
        <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-emerald-500" />
        <span className="grid h-11 w-11 place-items-center rounded-[18px] bg-emerald-600 text-white shadow-inner">
          <Users size={23} />
        </span>
      </button>
    </div>

    <div className="fixed bottom-24 right-5 z-[80]">
      {open && (
        <section className="mb-3 flex h-[min(520px,calc(100vh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl shadow-slate-900/18">
          <header className="flex h-16 items-center justify-between bg-gradient-to-r from-violet-600 to-sky-400 px-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/18">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="text-base font-extrabold">Lingo</h2>
                <p className="text-xs font-semibold text-white/80">Trợ lí AI Aptis ESOL</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/14 hover:bg-white/24"
              aria-label="Đóng Lingo"
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-sky-50 px-3 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className={`max-w-[280px] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'whitespace-pre-wrap bg-[#071426] text-white' : 'bg-white text-navy shadow-soft'}`}>
                  {message.role === 'assistant' ? <AssistantMessage content={message.content} /> : message.content}
                </div>
                {message.role === 'user' && (
                  <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-200 text-slate-700">
                    <UserRound size={14} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white">
                  <Sparkles size={14} />
                </span>
                Lingo đang trả lời...
              </div>
            )}
          </div>

          <form onSubmit={submit} className="flex items-end gap-2 border-t border-brand-100 bg-white p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder="Hỏi Lingo..."
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="Gửi"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setContactOpen(false);
          }}
          className="group relative grid h-[62px] w-[62px] place-items-center rounded-full bg-white shadow-xl shadow-slate-900/20 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-2xl"
          aria-label="Mở trợ lí Lingo"
        >
          <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-violet-600" />
          <span className="relative grid h-11 w-11 place-items-center rounded-[18px] bg-gradient-to-b from-slate-100 to-slate-300 shadow-inner">
            <span className="absolute top-2 h-4 w-7 rounded-lg bg-slate-800">
              <span className="absolute left-1.5 top-1 h-1.5 w-1.5 rounded-full bg-sky-300" />
              <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-rose-300" />
            </span>
            <span className="absolute bottom-2 h-2 w-5 rounded-full bg-violet-500/80" />
          </span>
        </button>
      </div>
    </div>
    </>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`blank-${index}`} className="h-1" />;

        const quote = trimmed.match(/^>\s*(.+)$/);
        if (quote) {
          return (
            <blockquote key={`${line}-${index}`} className="border-l-4 border-violet-300 pl-3 italic text-slate-700">
              {renderInlineMarkdown(quote[1])}
            </blockquote>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              <span>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
        if (heading) {
          return (
            <p key={`${line}-${index}`} className="font-extrabold text-navy">
              {renderInlineMarkdown(heading[1])}
            </p>
          );
        }

        return <p key={`${line}-${index}`}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.filter(Boolean).map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={`${part}-${index}`} className="font-extrabold">{bold[1]}</strong>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
