import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { examCountdownMessage, learningGoalUpdatedEvent, loadLearningGoal } from '../utils/learningRoadmap';
import './lingo-widget.css';

const phrases = [
  'Hôm nay mình luyện một bài nhé! 💪',
  'Mỗi ngày một chút, gần mục tiêu hơn! ✨',
  'Bạn cần hỗ trợ? Bấm nút bên dưới nhé 👇',
  'Thử một đề để xem mình tiến bộ thế nào nào! 📚',
  'Sai một câu là học thêm một điều mới đó! 💡',
  'Luyện đều mỗi ngày, Lingo cổ vũ bạn! 🎉',
  'Nhớ nghỉ mắt và uống nước nha! 💧',
  'Một bài luyện nhỏ cũng là một bước tiến! 🚀',
  'Hít thở sâu, bạn làm được mà! 🌟',
  'Học xong nhớ xem lại những câu sai nhé! 📝',
  'Bạn đã biết luyện key như thế nào chưa? 🔑',
  'Chưa biết bắt đầu luyện key từ đâu? Ghé mục Mẹo thi nhé! 📖',
  'Luyện key xong, thử che đáp án rồi tự làm lại nha! 🙈',
  'Nhớ key rồi thì tìm hiểu vì sao đáp án đúng nữa nhé! 💡',
  'Bạn đã xem Đề Key Dự Đoán hôm nay chưa? 🔍',
  'Luyện từng part trước, rồi thử sức với một đề đầy đủ nhé! 🎯',
  'Reading khó quá? Thử đọc câu hỏi trước để tìm từ khóa nha! 📚',
  'Listening thì nghe ý chính trước, bắt từ khóa sau nhé! 🎧',
  'Speaking đừng chỉ nghĩ trong đầu, nói thành tiếng cùng mình nào! 🎤',
  'Writing xong nhớ kiểm tra thì, chính tả và số từ nhé! ✍️',
  'Ghi lại những câu hay sai để buổi sau ôn lại nha! 📝',
  'Làm lại bài cũ cũng giúp bạn nhớ key lâu hơn đó! 🔁',
  'Có chỗ chưa hiểu? Các nút hỗ trợ ở ngay bên dưới nhé! 👇',
  'Sẵn sàng chưa? Mình chinh phục thêm một part nào! 🚀'
];
const pokePhrases = [
  'Úi, nhột quá! 😆 Luyện cùng mình nào!',
  'Lingo đây! Bạn gọi mình hả? 👋',
  'Chạm một cái, nhận một chút động lực! ⚡',
  'Mình đang bay mà, đừng cù mình chứ! 🤭',
  'Đã nhận năng lượng! Giờ mình học nhé! 🚀',
  'Bạn đã biết luyện key như thế nào chưa? Mở Mẹo thi xem thử nha! 🔑',
  'Chọc mình rồi thì hứa luyện thêm một bài nhé! 🤝',
  'Mình có bí kíp: học key rồi nhớ tự làm lại để kiểm tra nha! 💡',
  'Đang bí bài hả? Nghỉ một nhịp rồi mình thử lại nào! 🌿',
  'Lingo tiếp sức đây! Bạn muốn chinh phục part nào tiếp? 💪',
  'Nhớ key là một bước, hiểu cách làm là thêm một bước nữa! ✨'
];
const mutedKey = 'aptis-lingo-robot-muted';

export function FloatingRobot() {
  const userId = useAuthStore((state) => state.user?.id);
  const [message, setMessage] = useState('');
  const [pokes, setPokes] = useState(0);
  const [muted, setMuted] = useState(() => sessionStorage.getItem(mutedKey) === '1');
  const lastPhrase = useRef(-1);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownMessage = useCallback(() => userId == null ? null
    : examCountdownMessage(loadLearningGoal(`aptis-learning-goal:${userId}`)), [userId]);

  const speak = useCallback((text: string) => {
    clearTimeout(hideTimer.current);
    setMessage(text);
    hideTimer.current = setTimeout(() => setMessage(''), 5500);
  }, []);

  useEffect(() => {
    setMessage('');
    clearTimeout(hideTimer.current);
    function goalChanged() {
      const countdown = countdownMessage();
      if (!muted && countdown && !document.hidden) speak(countdown);
    }
    function storageChanged(event: StorageEvent) {
      if (event.key === `aptis-learning-goal:${userId}` || event.key === null) goalChanged();
    }
    window.addEventListener(learningGoalUpdatedEvent, goalChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener(learningGoalUpdatedEvent, goalChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, [countdownMessage, userId, muted, speak]);

  useEffect(() => {
    if (muted) return;
    let timer: ReturnType<typeof setTimeout>;
    let showCountdown = true;
    function sayNext() {
      if (!document.hidden) {
        const next = (lastPhrase.current + 1 + Math.floor(Math.random() * (phrases.length - 1))) % phrases.length;
        lastPhrase.current = next;
        const countdown = countdownMessage();
        speak(showCountdown && countdown ? countdown : phrases[next]);
        showCountdown = !showCountdown;
      }
      timer = setTimeout(sayNext, 45000 + Math.random() * 45000);
    }
    timer = setTimeout(sayNext, 10000);
    return () => clearTimeout(timer);
  }, [muted, speak, countdownMessage]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function poke() {
    setPokes((count) => count + 1);
    const countdown = countdownMessage();
    speak(countdown && pokes % 3 === 0 ? countdown : pokePhrases[pokes % pokePhrases.length]);
  }

  function dismiss() {
    clearTimeout(hideTimer.current);
    setMessage('');
    setMuted(true);
    sessionStorage.setItem(mutedKey, '1');
  }

  return (
    <div className="floating-lingo-robot">
      <div className="lingo-robot-announcement" role="status" aria-live="polite" aria-atomic="true">
        {message && <div className="lingo-robot-bubble">
          <button type="button" className="lingo-robot-dismiss" onClick={dismiss} aria-label="Tắt lời nhắc tự động trong phiên này">×</button>
          <span>{message}</span>
        </div>}
      </div>
      <button type="button" className="lingo-robot-touch" onClick={poke} aria-label="Chạm để trò chuyện với robot Lingo" title="Chạm vào mình nhé!">
        <span key={pokes} className={pokes ? 'lingo-robot-poke' : undefined}>
          <img className="lingo-robot-image" src="/brand/lingo-floating-robot.png" alt="" width={144} height={144} draggable={false} />
        </span>
      </button>
    </div>
  );
}
