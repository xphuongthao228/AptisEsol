import { useEffect, useRef, useState } from 'react';
import { materialContentHtml, sanitizeMaterialHtml, serializeMaterialHtml } from '../utils/materialHtml';
import './material-editor.css';

const commands = [
  ['bold', 'B', 'In đậm'], ['italic', 'I', 'In nghiêng'], ['underline', 'U', 'Gạch chân'],
  ['insertUnorderedList', '• Danh sách', 'Danh sách dấu đầu dòng'],
  ['insertOrderedList', '1. Danh sách', 'Danh sách đánh số'],
  ['justifyLeft', 'Trái', 'Căn trái'], ['justifyCenter', 'Giữa', 'Căn giữa'],
  ['justifyRight', 'Phải', 'Căn phải'], ['removeFormat', 'Xóa định dạng', 'Xóa định dạng'],
];

export function MaterialEditor({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const [active, setActive] = useState<string[]>([]);
  const [tooLong, setTooLong] = useState(false);
  useEffect(() => {
    if (editor.current && value !== lastValue.current) editor.current.innerHTML = materialContentHtml(value);
    lastValue.current = value;
  }, [value]);
  function sync() {
    if (!editor.current) return;
    const next = serializeMaterialHtml(editor.current.innerHTML);
    lastValue.current = next;
    setTooLong(next.length > 100000);
    onChange(next);
    setActive(commands.filter(([command]) => document.queryCommandState(command)).map(([command]) => command));
  }
  function command(name: string, argument?: string) {
    editor.current?.focus();
    document.execCommand(name, false, argument);
    sync();
  }
  return <div className="material-editor">
    <div role="toolbar" aria-label="Định dạng bài viết" className="material-editor-toolbar">
      {commands.map(([name, label, title]) => <button key={name} type="button" title={title} aria-label={title} aria-pressed={active.includes(name)} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command(name)}>{label}</button>)}
      <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command('formatBlock', 'h2')}>Tiêu đề lớn</button>
      <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command('formatBlock', 'h3')}>Tiêu đề nhỏ</button>
      <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => command('formatBlock', 'p')}>Văn bản thường</button>
    </div>
    <div ref={editor} className="material-rich-content material-editor-body" role="textbox" aria-label="Nội dung bài viết" aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning onInput={sync} onKeyUp={sync} onMouseUp={sync} onPaste={event => {
      event.preventDefault();
      const html = event.clipboardData.getData('text/html');
      if (html) command('insertHTML', sanitizeMaterialHtml(html));
      else command('insertHTML', materialContentHtml(event.clipboardData.getData('text/plain')));
    }} />
    <p className="mt-2 text-xs font-normal text-slate-500">Bôi đen nội dung rồi chọn định dạng. Có thể dán từ Word để giữ chữ đậm, nghiêng và danh sách.</p>
    {tooLong && <p role="alert" className="text-sm text-red-600">Nội dung quá dài (tối đa 100.000 ký tự kể cả định dạng). Vui lòng rút gọn trước khi lưu.</p>}
  </div>;
}
