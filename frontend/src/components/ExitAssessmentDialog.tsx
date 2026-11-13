import { useEffect, useRef } from 'react';

export function ExitAssessmentDialog({ open, onCancel, onConfirm }: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby="exit-assessment-title" aria-describedby="exit-assessment-description"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
      <h2 id="exit-assessment-title" className="text-xl font-extrabold">Bạn muốn thoát bài thi?</h2>
      <p id="exit-assessment-description" className="mt-3 leading-relaxed text-slate-600">
        Bạn đang làm bài. Nếu thoát lúc này, tiến trình chưa nộp sẽ không được lưu và bạn sẽ phải làm lại từ đầu.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" autoFocus onClick={onCancel} className="flex-1 rounded-xl bg-[#2b075c] px-4 py-3 font-bold text-white hover:bg-[#421080]">Tiếp tục làm bài</button>
        <button type="button" onClick={onConfirm} className="rounded-xl border border-red-200 px-4 py-3 font-bold text-red-700 hover:bg-red-50">Thoát bài thi</button>
      </div>
    </dialog>
  );
}
