import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, FileText, Headphones, Lightbulb, Loader2, Lock, Mic, PenLine, Search, Shuffle, SpellCheck, Star, Timer } from 'lucide-react';
import { X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { Question, SkillType, SubscriptionResponse, Test } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

const POINTS_PER_QUESTION = 2;
const PART_MENU_SKILL_KEY = 'aptis-part-menu-skill';
const partsPageHeroClass = 'mobile-page-heading halloween-parts-hero relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#2b0d42,#4c1233_58%,#6b1e34)] p-8 text-white shadow-soft';
const partsPageBackClass = 'inline-flex items-center gap-2 text-sm font-bold text-orange-50 transition hover:text-white';
const partsPageEyebrowClass = 'mt-7 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-100';
const partsPageLeadClass = 'mt-3 max-w-2xl text-blue-50/90';
const partsCardClass = 'rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft';
const partsCardLinkClass = `${partsCardClass} group transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift`;
const partsPrimaryActionClass = 'mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-extrabold text-white transition group-hover:bg-brand-700';
type PartGuide = {
  title: string;
  subtitle: string;
  sections: Array<{ title: string; points: string[] }>;
};

const skillCards: Array<{
  type: SkillType;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
}> = [
  {
    type: 'LISTENING',
    title: 'Listening',
    subtitle: 'Luyện nghe theo từng part và mẹo bắt keyword.',
    accent: 'bg-blue-50 text-brand-600',
    icon: <Headphones />
  },
  {
    type: 'SPEAKING',
    title: 'Speaking',
    subtitle: 'Luyện nói từng part, câu hỏi hình ảnh và bài mẫu.',
    accent: 'bg-rose-50 text-rose-600',
    icon: <Mic />
  },
  {
    type: 'READING',
    title: 'Reading',
    subtitle: 'Luyện gap-fill, sắp xếp câu, forum matching và đọc hiểu.',
    accent: 'bg-emerald-50 text-emerald-600',
    icon: <BookOpen />
  },
  {
    type: 'WRITING',
    title: 'Writing',
    subtitle: 'Luyện form, email, chat response và cách đếm từ.',
    accent: 'bg-amber-50 text-amber-600',
    icon: <PenLine />
  },
  {
    type: 'GRAMMAR',
    title: 'Grammar',
    subtitle: 'Luyện ngữ pháp, từ vựng, collocation và các dạng chọn đáp án.',
    accent: 'bg-violet-50 text-violet-600',
    icon: <SpellCheck />
  }
];

const defaultParts = [1, 2, 3, 4];

const partGuides: Partial<Record<SkillType, PartGuide>> = {
  LISTENING: {
    title: 'Hướng dẫn tự học Listening Aptis',
    subtitle: '40 phút, 4 phần',
    sections: [
      { title: 'Tài liệu AptisLingo', points: ['Tài liệu học tập do AptisLingo biên soạn độc lập, dành cho Aptis ESOL General.', 'Ví dụ minh họa là nội dung tự biên soạn.'] },
      { title: '1. Nguyên tắc cốt lõi', points: ['Luyện nghe hiểu trước, chép chính tả sau.', 'Không bắt đầu bằng việc chép toàn bộ audio dài.', 'Tách đoạn ngắn để xử lý âm và từ khó.'] },
      { title: '2. Hiểu 4 phần thi', points: ['Part 1: nhận biết thông tin cụ thể như giờ, số, địa điểm.', 'Part 2: ghép người nói với thông tin.', 'Part 3: nghe hội thoại, phân biệt ý kiến của nam/nữ/cả hai.', 'Part 4: nghe độc thoại dài, xác định quan điểm hoặc thái độ.', 'Theo hướng dẫn Aptis General, mỗi bản ghi có thể nghe tối đa hai lần trong bài thi.'] },
      { title: '3. Quy trình nghe 3 lượt khi luyện ở nhà', points: ['Lượt 1: nghe toàn đoạn để hiểu chủ đề.', 'Lượt 2: làm câu hỏi, ghi từ khóa.', 'Lượt 3 chỉ ở chế độ luyện tập: mở script, kiểm tra chỗ bỏ lỡ, nghe lại từng câu 5-15 giây.', 'Khi mô phỏng thi, tuân thủ giới hạn nghe của bài thi.'] },
      { title: '4. Ví dụ về bẫy nghe', points: ['Audio minh họa: The meeting was originally at nine, but it has been moved to ten thirty.', 'Question: What time is the meeting now?', 'Answer: 10:30.', 'Chú ý thông tin bị sửa đổi; không chọn thời gian nghe thấy đầu tiên.'] },
      { title: '5. Cách luyện từng phần', points: ['Part 1: tập số, giờ, tên riêng, địa điểm.', 'Part 2: ghi 1-2 từ khóa cho từng người nói.', 'Part 3: lập bảng Man / Woman / Both, nghe thái độ thay vì chỉ dò từ giống hệt.', 'Part 4: ghi ý chính và các từ chỉ lập trường như however, although, surprisingly.'] },
      { title: '6. Kế hoạch 20 phút/ngày', points: ['5 phút nghe thông tin cụ thể.', '8 phút làm một bài Part 2/3/4.', '5 phút phân tích lỗi với script.', '2 phút ghi lại ba cụm từ nghe chưa ra.', 'Mọi người chú ý học thuộc cả câu hỏi lẫn đáp án đúng.'] }
    ]
  },
  SPEAKING: {
    title: 'Hướng dẫn tự học Speaking Aptis',
    subtitle: '12 phút, 4 phần',
    sections: [
      { title: 'Tài liệu AptisLingo', points: ['Tài liệu học tập do AptisLingo biên soạn độc lập, dành cho Aptis ESOL General.', 'Ví dụ minh họa là nội dung tự biên soạn, không phải đề thi thật.'] },
      { title: '1. Mục tiêu học', points: ['Nói rõ ràng, trả lời đúng trọng tâm, có ví dụ cụ thể và hạn chế ngập ngừng.', 'Không học thuộc nguyên bài vì dễ lạc đề.'] },
      { title: '2. Hiểu 4 phần thi', points: ['Part 1: ba câu hỏi về bản thân, khoảng 30 giây/câu.', 'Part 2: mô tả một ảnh và trả lời hai câu liên quan, khoảng 45 giây/câu.', 'Part 3: so sánh hai ảnh và trả lời câu hỏi mở rộng, khoảng 45 giây/câu.', 'Part 4: trải nghiệm cá nhân và chủ đề trừu tượng; có thời gian chuẩn bị, trả lời dài hơn.', 'Hãy tập theo đồng hồ của giao diện thi.'] },
      { title: '3. Công thức triển khai ý', points: ['Part 1: Answer -> Reason -> Example. (Trả lời -> Đưa ra lý do -> Nêu ví dụ minh họa.)', 'Part 2: Overview -> People/Place -> Actions -> Impression. (Giới thiệu tổng quan -> Mô tả người/địa điểm -> Mô tả hành động -> Nêu cảm nhận.)', 'Part 3: Similarity -> Difference -> Explanation. (Chỉ ra điểm giống nhau -> Chỉ ra điểm khác nhau -> Giải thích và làm rõ.)', 'Part 4: Opinion -> 2 reasons -> example -> conclusion. (Nêu quan điểm -> Đưa ra 2 lý do -> Nêu ví dụ minh họa -> Kết luận.)', 'Đây là khung luyện tập, không phải mẫu bắt buộc.'] },
      { title: '4. Ví dụ thực hành', points: ['Question: What do you usually do at weekends? (Bạn thường làm gì vào cuối tuần?)', 'Sample: I usually spend time with my family at weekends. We often cook dinner together because it helps us relax after a busy week. Sometimes we go for a walk in the park.', 'Dịch: Tôi thường dành thời gian bên gia đình vào cuối tuần. Chúng tôi thường cùng nhau nấu bữa tối vì điều đó giúp mọi người thư giãn sau một tuần bận rộn. Thỉnh thoảng, chúng tôi đi dạo trong công viên.'] },
      { title: '5. Luyện tập 20 phút/ngày', points: ['5 phút nghe và nhại câu mẫu.', '5 phút trả lời Part 1.', '5 phút mô tả/so sánh ảnh.', '5 phút nghe lại bản ghi và ghi ba lỗi quan trọng.', 'Mỗi tuần làm một lượt đủ bốn phần.'] },
      { title: '6. Cách tự sửa lỗi', points: ['Nghe bản ghi và kiểm tra: có trả lời đúng câu hỏi không, đủ ý không, có nối ý không.', 'Kiểm tra từ nào phát âm chưa rõ và lỗi ngữ pháp nào lặp lại.', 'Sửa một lần rồi ghi âm lại.', 'AI hỗ trợ tham khảo, không thay thế đánh giá chính thức.'] },
      { title: '7. Bài tập tự luyện', points: ['Describe your favourite place.', 'Compare studying at home and studying in a library.', 'Do you think technology improves education? Explain.', 'Ghi âm và đánh giá theo các tiêu chí ở mục 6.', 'Luyện tập các câu ở luyện theo part.'] },
      { title: '8. Checklist trước khi thi', points: ['Tập nói đúng thời lượng.', 'Có ý chính và ví dụ.', 'Không dừng quá lâu.'] }
    ]
  },
  READING: {
    title: 'Hướng dẫn tự học Reading Aptis',
    subtitle: '35 phút, 4 phần chính thức',
    sections: [
      { title: 'Tài liệu AptisLingo', points: ['Tài liệu học tập do AptisLingo biên soạn độc lập, dành cho Aptis ESOL General.', 'Ví dụ minh họa là nội dung tự biên soạn, không phải đề thi thật.', 'Kiểm tra thông báo của đơn vị tổ chức thi để cập nhật định dạng.'] },
      { title: '1. Lưu ý về cách gọi Part', points: ['Aptis ESOL General chính thức có bốn phần Reading.', 'Part 2 gồm hai bài sắp xếp câu.', 'Một số ngân hàng luyện tập đánh số các bài thành năm mục.', 'Hãy phân biệt số bài trên web với cấu trúc chính thức.'] },
      { title: '2. Hiểu các phần thi', points: ['Part 1: điền từ vào văn bản ngắn.', 'Part 2: sắp xếp câu thành hai đoạn văn mạch lạc.', 'Part 3: ghép phát biểu với ý kiến của bốn người.', 'Part 4: ghép tiêu đề với các đoạn của bài đọc dài, có một tiêu đề dư. Các tiêu đề không đổi thứ tự.'] },
      { title: '3. Ba kỹ thuật đọc', points: ['Skimming: đọc nhanh để nắm ý chính.', 'Scanning: tìm tên, số, từ khóa hoặc thông tin cụ thể.', 'Paraphrase recognition: nhận ra cùng một ý được diễn đạt bằng từ khác.'] },
      { title: '4. Chiến thuật Part 1-2', points: ['Part 1: đọc cả câu và kiểm tra ngữ pháp, nghĩa.', 'Part 2: tìm đại từ thay thế, liên từ, trình tự thời gian, nguyên nhân - kết quả.', 'Câu mở đầu đã cố định, xác định câu theo sau bằng mối liên hệ rõ ràng.'] },
      { title: '5. Chiến thuật Part 3-4', points: ['Part 3: đọc phát biểu trước, gạch từ khóa, đối chiếu quan điểm chứ không ghép từ giống nhau.', 'Part 4: đọc ý chính mỗi đoạn, đặt nhãn 3-5 từ rồi mới so với tiêu đề.', 'Tránh chọn tiêu đề chỉ vì một chi tiết nhỏ.'] },
      { title: '6. Ví dụ sắp xếp câu', points: ['A. Finally, she submitted her application.', 'B. First, Mai searched for suitable courses.', 'C. After that, she prepared the required documents.', 'Thứ tự hợp lý: B -> C -> A, nhờ các dấu hiệu First, After that, Finally.'] },
      { title: '7. Phân bổ thời gian luyện tập', points: ['Đặt đồng hồ 35 phút cho bài đầy đủ.', 'Có thể thử Part 1: 5 phút.', 'Part 2: 9 phút.', 'Part 3: 9 phút.', 'Part 4: 12 phút rồi điều chỉnh theo kết quả cá nhân.', 'Đây là gợi ý luyện tập, không phải thời lượng bắt buộc.'] },
      { title: '8. Cách phân tích bài sai', points: ['Ghi câu sai.', 'Ghi đáp án đã chọn.', 'Ghi bằng chứng trong đoạn.', 'Ghi loại lỗi: thiếu từ vựng / bỏ sót phủ định / hiểu sai paraphrase / quản lý thời gian.', 'Làm lại sau 2-3 lần mà không xem đáp án.'] }
    ]
  },
  WRITING: {
    title: 'Hướng dẫn tự học Writing Aptis',
    subtitle: 'Aptis ESOL General, 50 phút, 4 phần',
    sections: [
      { title: 'Tài liệu AptisLingo', points: ['Tài liệu luyện tập độc lập.', 'Các công thức chỉ để gợi ý cách viết, không bắt buộc áp dụng máy móc.'] },
      { title: '1. Cấu trúc bài thi', points: ['Part 1: 5 câu trả lời ngắn.', 'Part 2: khoảng 20-30 từ.', 'Part 3: 3 câu, khoảng 30-40 từ/câu.', 'Part 4: email thân mật 40-50 từ và email trang trọng 120-150 từ.'] },
      { title: '2. Tìm ý bằng 5W1H', points: ['What (Cái gì?), Who (Ai?), When (Khi nào?), Where (Ở đâu?), Why (Tại sao?), How (Như thế nào?).', 'Chỉ chọn 2-3 ý cần thiết, không cần dùng đủ sáu yếu tố.', 'Tiếng Anh: What do you usually do at weekends?', 'Dịch: Bạn thường làm gì vào cuối tuần?', 'Tiếng Anh: I usually cook with my family because it helps us relax. Sometimes, we go for a walk.', 'Dịch: Tôi thường nấu ăn cùng gia đình vì việc đó giúp chúng tôi thư giãn. Thỉnh thoảng, chúng tôi đi dạo.'] },
      { title: '3. Part 1 - Trả lời ngắn', points: ['Công thức: Question -> Short answer (Câu hỏi -> Câu trả lời ngắn).', 'Xác định thông tin được hỏi, trả lời trực tiếp và kiểm tra chính tả.', 'Tiếng Anh: Where do you live? - In Hanoi.', 'Dịch: Bạn sống ở đâu? - Ở Hà Nội.'] },
      { title: '4. Part 2 - Viết 20-30 từ', points: ['Công thức: Answer -> Reason -> Detail (Trả lời -> Lý do -> Chi tiết).', 'Có thể dùng because (bởi vì) để nối ý.', 'Tiếng Anh: Why do you want to join the photography club?', 'Dịch: Tại sao bạn muốn tham gia câu lạc bộ nhiếp ảnh?', 'Tiếng Anh: I want to join the photography club because I enjoy taking pictures of nature. I hope to learn new skills and make friends with similar interests.', 'Dịch: Tôi muốn tham gia câu lạc bộ nhiếp ảnh vì thích chụp ảnh thiên nhiên. Tôi hy vọng học kỹ năng mới và kết bạn với những người có cùng sở thích.'] },
      { title: '5. Part 3 - Ba câu trả lời 30-40 từ', points: ['Công thức: Answer -> Reason -> Example -> Feeling (Trả lời -> Lý do -> Ví dụ -> Cảm nhận).', 'Ưu tiên trả lời đúng trọng tâm, sau đó thêm một lý do hoặc ví dụ.', 'Tiếng Anh: What do you enjoy about your neighbourhood?', 'Dịch: Bạn thích điều gì ở khu phố nơi mình sống?', 'Tiếng Anh: I like my neighbourhood because it is peaceful and convenient. There is a park near my home, so I often go jogging there. The people are friendly, and I feel comfortable living here.', 'Dịch: Tôi thích khu phố của mình vì yên bình và thuận tiện. Có một công viên gần nhà nên tôi thường chạy bộ ở đó. Mọi người thân thiện và tôi cảm thấy thoải mái khi sống tại đây.'] },
      { title: '6. Part 4 - Viết hai email', points: ['Email thân mật: Greeting -> Feeling -> Reason -> Suggestion -> Closing (Chào hỏi -> Cảm xúc -> Lý do -> Đề xuất -> Kết thúc).', 'Ví dụ: Hi Anna, I’m disappointed that our trip was cancelled. I was really looking forward to it. Maybe we can plan another trip next month. What do you think? See you soon! Mai', 'Email trang trọng: Greeting -> Purpose -> Details -> Request -> Closing (Chào hỏi -> Mục đích -> Chi tiết -> Đề nghị -> Kết thúc).', 'Ví dụ: Dear Sir or Madam, I am writing regarding the cancelled club trip. I understand that unexpected problems can occur, but I would appreciate more information about the cancellation. Could you please let members know whether a new date will be arranged or a refund will be offered? Thank you for your time. I look forward to hearing from you. Yours faithfully, Mai', 'Lưu ý: Email trang trọng trên chỉ minh họa cách diễn đạt; khi luyện đề cần phát triển thêm chi tiết để đạt 120-150 từ.'] },
      { title: '7. PEEL và cách tự kiểm tra', points: ['PEEL: Point (Ý chính) -> Explain (Giải thích) -> Example (Ví dụ) -> Link (Kết luận/liên kết).', 'Dùng khi cần giải thích quan điểm, không cần ép vào mọi câu trả lời.', 'Quy trình: Đọc đề -> tìm 2-3 ý bằng 5W1H -> viết theo công thức phù hợp -> kiểm tra số từ, thì, chia động từ, chính tả và giọng điệu.', 'Luyện 25 phút/ngày: 5 phút ngữ pháp, 10 phút viết, 5 phút xem lỗi, 5 phút tự viết lại.', 'Mỗi tuần luyện Part 4 có bấm giờ.'] }
    ]
  }
};

function useRequireLogin() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (accessToken) return;

    event.preventDefault();
    toast.error('Bạn cần đăng nhập để làm bài luyện.', { id: 'login-required' });
    navigate('/login');
  };
}

export function Tests() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const { data: subscription } = useApi<SubscriptionResponse | null>(
    () => accessToken ? unwrap<SubscriptionResponse>(api.get('/payments/subscription/me')).catch(() => null) : Promise.resolve(null),
    [accessToken]
  );
  const [query, setQuery] = useState('');
  const tests = data ?? [];
  const proActive = Boolean(subscription?.proActive);

  if (loading) return <InfoCard>Đang tải danh sách bài luyện...</InfoCard>;
  if (error && accessToken) return <InfoCard error>{error}</InfoCard>;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Luyện tập theo 5 kỹ năng</h1>
          <p className="mt-3 max-w-2xl text-lg leading-7 text-slate-600">
            Chọn kỹ năng để luyện theo từng part hoặc xem mẹo làm bài.
          </p>
        </div>
        <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 text-slate-500 shadow-soft md:max-w-[420px]">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kỹ năng hoặc bài luyện..."
          />
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {skillCards.map((skill) => (
          <SkillPracticeCard
            key={skill.type}
            skill={skill}
            proActive={proActive}
            tests={tests
              .filter((test) => !isRandomTest(test))
              .filter((test) => normalizeSkill(test.skillName) === skill.type)
              .filter((test) => {
                const keyword = query.trim().toLowerCase();
                if (!keyword) return true;
                return skill.title.toLowerCase().includes(keyword) || test.title.toLowerCase().includes(keyword);
              })}
          />
        ))}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-brand-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-3 font-semibold text-slate-700"><ArrowLeft />Quay lại</Link>
          <span className="rounded-full bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700">Chọn kỹ năng để bắt đầu</span>
          <span className="hidden items-center gap-3 font-semibold text-slate-700 sm:inline-flex">Kế tiếp <ArrowRight /></span>
        </div>
      </div>
    </div>
  );
}

export function TestPartMenu() {
  const requireLogin = useRequireLogin();
  const partSkills = skillCards.filter((skill) => skill.type !== 'GRAMMAR');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSkillType, setSelectedSkillType] = useState<SkillType>(() => {
    const skillFromUrl = normalizeParam(searchParams.get('skill') ?? undefined);
    const skillFromStorage = getStoredPartSkill();
    return skillFromUrl || skillFromStorage || partSkills[0].type;
  });
  const selectedSkill = partSkills.find((skill) => skill.type === selectedSkillType) ?? partSkills[0];
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const selectedPracticeTests = useMemo(() => {
    return (data ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter(hasImportedQuestions)
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill.type)
      .sort(compareTestsByNaturalNumber);
  }, [data, selectedSkill.type]);
  const selectedPracticeTestIds = selectedPracticeTests.map((test) => test.id).join(',');
  const { data: selectedPracticeGroups, loading: practiceQuestionsLoading, error: practiceQuestionsError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (!selectedPracticeTests.length) return [];
      const groups = await Promise.all(selectedPracticeTests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
      return groups;
    },
    [selectedPracticeTestIds]
  );
  const { data: writingGroups, loading: writingLoading, error: writingError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (selectedSkill.type !== 'WRITING' || !selectedPracticeTests.length) return [];
      return Promise.all(selectedPracticeTests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [selectedSkill.type, selectedPracticeTestIds]
  );
  const writingTopics = useMemo(() => getWritingClubTopics(writingGroups ?? []), [writingGroups]);
  const isWritingSelected = selectedSkill.type === 'WRITING';
  const [guideSkill, setGuideSkill] = useState<SkillType | null>(null);

  useEffect(() => {
    const nextSkill = normalizeParam(searchParams.get('skill') ?? undefined);
    if (nextSkill && nextSkill !== selectedSkillType && partSkills.some((skill) => skill.type === nextSkill)) {
      setSelectedSkillType(nextSkill);
    }
  }, [searchParams]);

  function selectSkill(skillType: SkillType) {
    setSelectedSkillType(skillType);
    window.localStorage.setItem(PART_MENU_SKILL_KEY, skillType);
    setSearchParams({ skill: skillType }, { replace: true });
  }

  return (
    <div className="mobile-parts-page space-y-7">
      <section className={partsPageHeroClass}>
        <div className="halloween-scene" aria-hidden="true">
          <div className="halloween-moon" />
          <div className="halloween-cloud halloween-cloud-one" />
          <div className="halloween-cloud halloween-cloud-two" />
          <div className="halloween-web halloween-web-right" />
          <div className="halloween-bat halloween-bat-one" />
          <div className="halloween-bat halloween-bat-two" />
          <div className="halloween-bat halloween-bat-three" />
          <div className="halloween-pumpkin halloween-pumpkin-main" />
          <div className="halloween-pumpkin halloween-pumpkin-left" />
          <div className="halloween-pumpkin halloween-pumpkin-small" />
          <div className="halloween-ground" />
          <div className="halloween-sparkles" />
        </div>
        <Link to="/app/tests" className={partsPageBackClass}><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className={partsPageEyebrowClass}>
          {isWritingSelected ? 'Luyện tập theo chủ đề' : 'Luyện tập theo part'}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold">Chọn kỹ năng cần luyện tập</h1>
        <p className={partsPageLeadClass}>
          {isWritingSelected
            ? 'Chọn Writing, sau đó chọn chủ đề câu hỏi bạn muốn luyện.'
            : 'Chọn Nghe, Nói hoặc Đọc, sau đó chọn Part 1, 2, 3 hoặc 4 để luyện.'}
        </p>
      </section>

      <section className="parts-skill-selector flex flex-wrap gap-3" aria-label="Chọn kỹ năng luyện tập">
        {partSkills.map((skill) => (
          (() => {
            const active = selectedSkill.type === skill.type;
            const textColor = active ? '#ffffff' : '#7f1d1d';
            return (
              <button
                key={skill.type}
                type="button"
                onClick={() => selectSkill(skill.type)}
                aria-pressed={active}
                className={`inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-extrabold transition ${
                  active
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'border border-brand-100 bg-white text-red-900 hover:border-brand-200 hover:text-brand-700'
                }`}
                style={{ color: textColor }}
              >
                <span className="parts-skill-icon" style={{ color: textColor }}>{skill.icon}</span>
                <span className="parts-skill-label" style={{ color: textColor }}>{skill.title}<small className="sm:hidden" style={{ color: textColor }}>{skill.type === 'WRITING' ? 'Luyện tập theo chủ đề' : `${partsForSkill(skill.type).length} phần luyện tập`}</small></span>
                <ChevronDown className="parts-skill-chevron sm:hidden" size={20} style={{ color: textColor }} />
              </button>
            );
          })()
        ))}
      </section>

      {(error || (isWritingSelected ? writingError : practiceQuestionsError)) && (
        <InfoCard error>{error || (isWritingSelected ? writingError : practiceQuestionsError)}</InfoCard>
      )}

      <section className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${selectedSkill.accent}`}>{selectedSkill.icon}</div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{isWritingSelected ? 'Theo chủ đề' : 'Theo part'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-navy">{selectedSkill.title}</h2>
              <p className="mt-2 leading-7 text-slate-600">
                {isWritingSelected ? 'Luyện Writing theo từng nhóm chủ đề câu hỏi.' : selectedSkill.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGuideSkill(selectedSkill.type)}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-600 bg-white px-5 text-sm font-extrabold text-brand-600 transition hover:bg-brand-50"
          >
            <Lightbulb size={18} />
            Hướng dẫn cách học
          </button>
        </div>
      </section>

      {isWritingSelected ? (
        writingLoading || loading ? (
          <InfoCard>Đang tải chủ đề Writing...</InfoCard>
        ) : writingTopics.length ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {writingTopics.map((topic) => (
              <Link
                key={`${topic.testId}-${topic.questionId}-${topic.clubIndex}`}
                to={`/app/tests/${topic.testId}?questionId=${topic.questionId}&clubIndex=${topic.clubIndex}`}
                state={{ returnTo: '/app/tests/parts?skill=WRITING' }}
                onClick={requireLogin}
                className={partsCardLinkClass}
              >
                <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${selectedSkill.accent}`}>
                  <FileText />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Chủ đề Writing</p>
                <h2 className="mt-1 text-2xl font-extrabold text-navy">{topic.displayName}</h2>
                <span className={partsPrimaryActionClass}>
                  Bắt đầu <ArrowRight size={17} />
                </span>
              </Link>
            ))}
          </section>
        ) : (
          <InfoCard>Chưa có chủ đề Writing. Hãy import file Writing trong Admin.</InfoCard>
        )
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {partsForSkill(selectedSkill.type).map((part) => {
            const partGroups = (selectedPracticeGroups ?? [])
              .map(({ test, questions }) => ({
                test,
                questions: questions.filter((question) => isQuestionInPart(question, selectedSkill.type, part, test))
              }))
              .filter(({ questions }) => questions.length > 0);
            const firstGroup = partGroups[0];
            const cardContent = (
              <>
                <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${selectedSkill.accent}`}>
                  <FileText />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{selectedSkill.title}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-navy">Part {part}</h2>
                <p className="mt-2 min-h-6 text-sm leading-6 text-slate-600">
                  {loading || practiceQuestionsLoading ? 'Đang tải bài luyện...' : `${partGroups.length} đề đã import`}
                </p>
                <span className={`mt-6 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition ${
                  firstGroup ? 'bg-brand-600 text-white group-hover:bg-brand-700' : 'bg-sky-100 text-slate-500'
                }`}>
                  {firstGroup ? 'Xem các đề' : 'Chưa có bài'} {firstGroup && <ArrowRight size={17} />}
                </span>
              </>
            );

            if (!firstGroup) {
              return (
                <div key={`${selectedSkill.type}-${part}`} className={partsCardClass}>
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={`${selectedSkill.type}-${part}`}
                to={`/app/tests/${firstGroup.test.id}`}
                state={{ returnTo: `/app/tests/parts?skill=${selectedSkill.type}` }}
                className={partsCardLinkClass}
              >
                {cardContent}
              </Link>
            );
          })}
        </section>
      )}
      {guideSkill && (
        <PartGuideModal
          guide={partGuides[guideSkill]}
          skillTitle={skillCards.find((skill) => skill.type === guideSkill)?.title ?? 'Aptis'}
          onClose={() => setGuideSkill(null)}
        />
      )}
    </div>
  );

}

function PartGuideModal({ guide, skillTitle, onClose }: { guide?: PartGuide; skillTitle: string; onClose: () => void }) {
  if (!guide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="mx-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">Hướng dẫn cách học {skillTitle}</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">{guide.title}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{guide.subtitle}</p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-100 text-slate-600 hover:bg-sky-50" onClick={onClose} aria-label="Đóng hướng dẫn">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-4 sm:p-6">
          <div className="mx-auto max-w-5xl rounded-xl bg-white px-5 py-6 shadow-soft sm:px-10 sm:py-8">
            {guide.sections.map((section) => (
              <section key={section.title} className="border-b border-slate-200 py-5 first:pt-0 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-extrabold text-navy">{section.title}</h3>
                <div className="mt-3 space-y-3">
                  {section.points.map((point) => (
                    <p key={point} className="text-base font-medium leading-8 text-slate-700">
                      {point}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkillQuestionParts() {
  const requireLogin = useRequireLogin();
  const { skillType } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data, loading, error } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const tests = useMemo(() => {
    if (!selectedSkill) return [];
    return (data ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill);
  }, [data, selectedSkill]);

  const { data: writingGroups, loading: writingLoading, error: writingError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (selectedSkill !== 'WRITING' || !tests.length) return [];
      return Promise.all(tests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [selectedSkill, tests.map((test) => test.id).join(',')]
  );
  const writingTopics = useMemo(() => getWritingClubTopics(writingGroups ?? []), [writingGroups]);
  const { data: partQuestionGroups, loading: partQuestionsLoading, error: partQuestionsError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (!selectedSkill || selectedSkill === 'WRITING' || !tests.length) return [];
      return Promise.all(tests.map(async (test) => ({
        test,
        questions: await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`))
      })));
    },
    [selectedSkill, tests.map((test) => test.id).join(',')]
  );

  if (loading || (selectedSkill === 'WRITING' && writingLoading) || (selectedSkill !== 'WRITING' && partQuestionsLoading)) return <InfoCard>Đang tải danh sách...</InfoCard>;
  if (error || (selectedSkill === 'WRITING' && writingError) || (selectedSkill !== 'WRITING' && partQuestionsError)) return <InfoCard error>{error || (selectedSkill === 'WRITING' ? writingError : partQuestionsError)}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  if (selectedSkill === 'WRITING') {
    return (
      <div className="space-y-7">
        <section className={partsPageHeroClass}>
          <Link to="/app/tests/parts?skill=WRITING" className={partsPageBackClass}><ArrowLeft size={18} />Quay lại luyện tập</Link>
          <p className={partsPageEyebrowClass}>Luyện theo chủ đề</p>
          <h1 className="mt-3 text-4xl font-extrabold">Writing</h1>
          <p className={partsPageLeadClass}>Chọn chủ đề Writing bạn muốn luyện.</p>
        </section>

        {writingTopics.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {writingTopics.map((topic) => (
              <Link
                to={`/app/tests/${topic.testId}?questionId=${topic.questionId}&clubIndex=${topic.clubIndex}`}
                onClick={requireLogin}
                className={`${partsCardLinkClass} flex min-h-24 items-center justify-center border-orange-200 bg-orange-50 text-center text-lg font-black text-orange-950 hover:border-orange-300`}
                key={`${topic.testId}-${topic.questionId}-${topic.clubIndex}`}
              >
                {topic.displayName}
              </Link>
            ))}
          </section>
        ) : (
          <InfoCard>Chưa có chủ đề Writing. Hãy import file Writing trong Admin.</InfoCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className={partsPageHeroClass}>
        <Link to="/app/tests/parts" className={partsPageBackClass}><ArrowLeft size={18} />Quay lại luyện tập</Link>
        <p className={partsPageEyebrowClass}>Luyện theo part</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title}</h1>
        <p className={partsPageLeadClass}>Chọn part bạn muốn luyện.</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {partsForSkill(selectedSkill).map((part) => {
            const displayTests = (partQuestionGroups ?? [])
              .filter(({ test, questions }) => questions.some((question) => isQuestionInPart(question, selectedSkill, part, test)))
              .map(({ test }) => test);
          const firstTest = displayTests[0];
          return (
            <div className={partsCardClass} key={part}>
              <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${skill.accent}`}>
                <FileText />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{skill.title}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-navy">Part {part}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{displayTests.length} bài luyện</p>
              {firstTest ? (
                <Link to={`/app/tests/questions/${skill.type}/part/${part}`} onClick={requireLogin} className={partsPrimaryActionClass}>
                  Bắt đầu <ArrowRight size={17} />
                </Link>
              ) : (
                <button className="mt-6 flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl bg-sky-100 text-sm font-extrabold text-slate-500" type="button">
                  Chưa có bài
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function SkillPartQuestions() {
  const requireLogin = useRequireLogin();
  const { skillType, part } = useParams();
  const selectedSkill = normalizeParam(skillType);
  const selectedPart = Number(part);
  const skill = skillCards.find((item) => item.type === selectedSkill);
  const { data: allTests, loading: testsLoading, error: testsError } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);

  const partTests = useMemo(() => {
    if (!selectedSkill || !Number.isFinite(selectedPart)) return [];
    return (allTests ?? [])
      .filter(isPartPracticeSource)
      .filter((test) => !isRandomTest(test))
      .filter(hasImportedQuestions)
      .filter((test) => normalizeSkill(test.skillName) === selectedSkill)
      .filter((test) => selectedPart <= 4 || selectedSkill === 'READING')
      .sort(compareTestsByNaturalNumber);
  }, [allTests, selectedPart, selectedSkill]);

  const { data: questionGroups, loading: questionsLoading, error: questionsError } = useApi<Array<{ test: Test; questions: Question[] }>>(
    async () => {
      if (!partTests.length) return [];
      const groups = await Promise.all(partTests.map(async (test) => ({
        test,
        questions: (await unwrap<Question[]>(api.get(`/questions?testId=${test.id}`)))
          .filter((question) => isQuestionInPart(question, selectedSkill, selectedPart, test))
      })));
      return groups.filter((group) => group.questions.length > 0);
    },
    [partTests.map((test) => test.id).join(','), selectedPart, selectedSkill]
  );

  if (testsLoading || questionsLoading) return <QuestionLoadingState skillTitle={skill?.title ?? 'Aptis'} part={selectedPart} />;
  if (testsError || questionsError) return <InfoCard error>{testsError || questionsError}</InfoCard>;
  if (!skill) return <InfoCard>Không tìm thấy kỹ năng.</InfoCard>;

  const totalQuestions = questionGroups?.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;

  return (
    <div className="space-y-7">
      <section className={partsPageHeroClass}>
        <Link to={`/app/tests/questions/${skill.type}`} className={partsPageBackClass}><ArrowLeft size={18} />Quay lại chọn part</Link>
        <p className={partsPageEyebrowClass}>Luyện theo part</p>
        <h1 className="mt-3 text-4xl font-extrabold">{skill.title} - Part {selectedPart}</h1>
        <p className={partsPageLeadClass}>Có {totalQuestions} câu hỏi. Chọn câu để luyện.</p>
      </section>

      {questionGroups?.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {questionGroups.map(({ test, questions }) => (
            <Link
              key={test.id}
              to={`/app/tests/${test.id}`}
              state={{ returnTo: `/app/tests/questions/${skill.type}/part/${selectedPart}` }}
              onClick={requireLogin}
              className={partsCardLinkClass}
            >
              <div className={`mb-5 grid h-14 w-14 place-items-center rounded-2xl ${skill.accent}`}>
                <FileText />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{skill.title} - Part {selectedPart}</p>
                  <h2 className="mt-1 line-clamp-2 text-2xl font-extrabold text-navy">{test.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{questions.length} câu hỏi trong part này</p>
                </div>
                <ArrowRight className="mt-2 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-brand-600" size={18} />
              </div>
              <span className={partsPrimaryActionClass}>
                Bắt đầu <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <InfoCard>Chưa có câu hỏi nào cho {skill.title} Part {selectedPart}.</InfoCard>
      )}
    </div>
  );
}

function SkillPracticeCard({ skill, tests, proActive }: {
  skill: (typeof skillCards)[number];
  tests: Test[];
  proActive: boolean;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const practiceTests = tests.filter(isPracticeTest).filter(hasImportedQuestions);
  const firstPracticeTest = practiceTests[0];

  return (
    <div className="rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${skill.accent}`}>{skill.icon}</div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Kỹ năng</p>
            <h2 className="mt-1 text-2xl font-extrabold text-navy">{skill.title}</h2>
            <p className="mt-2 max-w-xl leading-7 text-slate-600">{skill.subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-slate-700">{practiceTests.length} bài luyện</span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <ModeButton
          to={`/app/tests/questions/${skill.type}`}
          icon={accessToken && !proActive ? <Lock size={18} /> : <FileText size={18} />}
          title={accessToken && !proActive ? 'Theo part cần Pro' : 'Luyện theo part'}
          disabled={Boolean(accessToken) && (!firstPracticeTest || !proActive)}
          proLocked={Boolean(accessToken) && Boolean(firstPracticeTest) && !proActive}
          primary
        />
        <ModeButton to={`/app/lessons/${skill.type}`} icon={<Lightbulb size={18} />} title="Mẹo học" />
      </div>

      {!practiceTests.length && (
        <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-slate-600">
          Chưa có bài luyện cho kỹ năng này. Tạo bài trong Admin - Nội dung - Bài luyện.
        </p>
      )}
    </div>
  );
}

function ModeButton({ to, icon, title, primary, disabled, proLocked }: {
  to: string;
  icon: ReactNode;
  title: string;
  primary?: boolean;
  disabled?: boolean;
  proLocked?: boolean;
}) {
  const requireLogin = useRequireLogin();
  const navigate = useNavigate();

  if (disabled) {
    return (
      <button
        className={`flex h-12 items-center justify-center gap-2 rounded-xl border border-brand-100 bg-sky-100 text-sm font-extrabold text-slate-500 ${proLocked ? 'cursor-pointer hover:border-brand-200 hover:text-brand-700' : 'cursor-not-allowed'}`}
        type="button"
        onClick={proLocked ? () => {
          toast.error('Bạn cần nâng cấp tài khoản để sử dụng tính năng này.', { id: 'upgrade-required' });
          window.setTimeout(() => navigate('/app/renewal'), 900);
        } : undefined}
      >
        {icon}{title}
      </button>
    );
  }

  return (
    <Link className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold ${primary ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-brand-50'}`} to={to} onClick={requireLogin}>
      {icon}{title}
    </Link>
  );
}

function InfoCard({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`rounded-[18px] border bg-white p-7 ${error ? 'border-red-200 text-red-600' : 'border-brand-100 text-slate-700'}`}>
      {children}
    </div>
  );
}

function QuestionLoadingState({ skillTitle, part }: { skillTitle: string; part: number }) {
  return (
    <div className="space-y-6">
      <section className={partsPageHeroClass}>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-extrabold text-blue-100">
          <Loader2 className="animate-spin" size={18} />
          Đang lấy đề
        </div>
        <h1 className="mt-5 text-4xl font-extrabold">{skillTitle} - Part {Number.isFinite(part) ? part : ''}</h1>
        <p className={partsPageLeadClass}>Hệ thống đang tải danh sách câu hỏi cho phần luyện này.</p>
      </section>

      <section className="space-y-4 rounded-[22px] border border-brand-100 bg-white p-6 shadow-soft" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-brand-700">
          <Loader2 className="animate-spin" size={22} />
          <span className="font-extrabold">Đang chuẩn bị câu hỏi...</span>
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-brand-100 bg-sky-50 p-4">
            <div className="h-4 w-2/3 rounded-full bg-slate-200" />
            <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-200" />
          </div>
        ))}
      </section>
    </div>
  );
}

function normalizeSkill(skillName: string): SkillType | '' {
  const value = removeVietnameseMarks(skillName).toUpperCase();
  if (value.includes('LISTENING') || value.includes('NGHE')) return 'LISTENING';
  if (value.includes('SPEAKING') || value.includes('NOI')) return 'SPEAKING';
  if (value.includes('READING') || value.includes('DOC')) return 'READING';
  if (value.includes('WRITING') || value.includes('VIET')) return 'WRITING';
  if (value.includes('GRAMMAR') || value.includes('NGU PHAP')) return 'GRAMMAR';
  return '';
}

function removeVietnameseMarks(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function skillLabel(skillName: string) {
  const skill = normalizeSkill(skillName);
  if (skill === 'LISTENING') return 'Nghe';
  if (skill === 'SPEAKING') return 'Nói';
  if (skill === 'READING') return 'Đọc hiểu';
  if (skill === 'WRITING') return 'Viết';
  if (skill === 'GRAMMAR') return 'Grammar';
  return 'Bài luyện';
}

function formatTestTitle(title: string, skillName: string) {
  const skill = skillLabel(skillName);
  const cleaned = (title || 'Bài luyện Aptis').trim();
  return cleaned
    .replace(/^de\s+/i, 'Đề ')
    .replace(/^đề\s+/i, 'Đề ')
    .replace(/\blistening\b/i, skill === 'Nghe' ? 'Listening' : 'Listening')
    .replace(/\bspeaking\b/i, 'Speaking')
    .replace(/\breading\b/i, 'Reading')
    .replace(/\bwriting\b/i, 'Writing')
    .replace(/\bgrammar\b/i, 'Grammar');
}

function normalizeParam(value?: string): SkillType | '' {
  const upper = value?.toUpperCase();
  return upper === 'LISTENING' || upper === 'SPEAKING' || upper === 'READING' || upper === 'WRITING' || upper === 'GRAMMAR' ? upper : '';
}

function getStoredPartSkill(): SkillType | '' {
  if (typeof window === 'undefined') return '';
  return normalizeParam(window.localStorage.getItem(PART_MENU_SKILL_KEY) ?? undefined);
}

function filterTestsByPart(tests: Test[], part: number) {
  const pattern = new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i');
  return tests.filter((test) => pattern.test(normalizePartSearchText(`${test.title} ${test.description}`)));
}

function partsForSkill(skill?: SkillType | '') {
  return defaultParts;
}

function isPartPracticeSource(test: Test) {
  return test.status === 'PUBLISHED' && isPracticeTest(test) && hasImportedQuestions(test);
}

function isQuestionInPart(question: Question, skill: SkillType | '', part: number, test?: Test) {
  const template = parseQuestionTemplate(question.content);
  const rawPart = template && 'part' in template ? String((template as { part?: unknown }).part ?? '') : '';
  const content = normalizePartSearchText([
    test?.title,
    test?.description,
    question.topic,
    question.content,
    question.explanation,
    rawPart
  ].map((value) => String(value ?? '')).join(' ')).toLowerCase();

  if (rawPart) {
    const parsed = Number(rawPart.replace(/\D+/g, ''));
    if (Number.isFinite(parsed) && parsed === part) return true;
  }

  if (skill === 'LISTENING') {
    const templateName = String(template?.template ?? '').toUpperCase();
    const variant = String((template as { variant?: unknown } | null)?.variant ?? '').toUpperCase();
    if (part === 2 && templateName === 'LISTENING_PEOPLE_MATCH') return true;
    if (part === 3 && templateName === 'LISTENING_OPINION_MATCH') return true;
    if (templateName === 'LISTENING_AUDIO_MC') {
      if (part === 1 && variant === 'PART1') return true;
      if (part === 4 && variant !== 'PART1') return true;
    }
  }

  if (skill === 'READING') {
    const templateName = String(template?.template ?? '').toUpperCase();
    const explicitTestPart = parsePartNumber(`${test?.title ?? ''} ${test?.description ?? ''}`);
    if (explicitTestPart !== null) return explicitTestPart === part;

    if (part === 1 && templateName === 'READING_GAP_FILL') return true;
    if (part === 2 && templateName === 'READING_SENTENCE_ORDER') return true;
    if (part === 3 && templateName === 'READING_FORUM_MATCH') return true;
    if (part === 4 && templateName === 'READING_HEADING_MATCH') return true;

    return false;
  }

  return new RegExp(`\\b(part|phan|p|set)\\s*${part}\\b|\\b${part}\\s*(/|-)`, 'i').test(content);
}

function normalizePartSearchText(value: string) {
  return removeVietnameseMarks(value)
    .replace(/[_/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePartNumber(value: string) {
  const normalized = normalizePartSearchText(value).toLowerCase();
  const match = normalized.match(/\b(?:part|phan|p|set)\s*([1-5])\b/);
  return match ? Number(match[1]) : null;
}

function isExamTest(test: Test) {
  if (test.mode) return test.mode === 'EXAM';
  const value = `${test.title ?? ''} ${test.description ?? ''}`.toLowerCase();
  if (value.includes('practice') || value.includes('luyen tap')) return false;
  return value.includes('bo de') || value.includes('de thi') || value.includes('exam') || value.includes('mock');
}

function isPracticeTest(test: Test) {
  return !isExamTest(test);
}

function isRandomTest(test: Test) {
  const title = test.title.toLowerCase();
  return title.startsWith('bộ đề random');
}

function hasImportedQuestions(test: Test) {
  return (test.questionCount ?? 0) > 0;
}

function isFreeAllowedExam(tests: Test[], target: Test) {
  const skill = normalizeSkill(target.skillName);
  return tests
    .filter((test) => test.mode === 'EXAM' && test.status === 'PUBLISHED')
    .filter((test) => !isRandomTest(test))
    .filter((test) => normalizeSkill(test.skillName) === skill)
    .sort((left, right) => left.id - right.id)
    .slice(0, 2)
    .some((test) => test.id === target.id);
}

function compareTestsByNaturalNumber(left: Test, right: Test) {
  const leftNumber = getTestOrderNumber(left);
  const rightNumber = getTestOrderNumber(right);

  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;

  return `${left.title} ${left.description ?? ''}`.localeCompare(
    `${right.title} ${right.description ?? ''}`,
    'vi',
    { numeric: true, sensitivity: 'base' }
  );
}

function getTestOrderNumber(test: Test) {
  const value = `${test.title ?? ''} ${test.description ?? ''}`;
  const patterns = [
    /\bpractice\s*test\s*(\d+)\b/i,
    /\btest\s*(\d+)\b/i,
    /#\s*0*(\d+)\b/i,
    /\b(?:bo\s*de|bộ\s*đề|de|đề)\s*0*(\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  return null;
}

function getWritingClubTopics(groups: Array<{ test: Test; questions: Question[] }>) {
  return groups.flatMap(({ test, questions }) =>
    questions.flatMap((question) => {
      const template = parseQuestionTemplate(question.content);
      if (template?.template !== 'WRITING_CLUB_COLLECTION' || !Array.isArray(template.clubs)) return [];
      return template.clubs.map((club: { clubName?: string }, clubIndex: number) => ({
        testId: test.id,
        questionId: question.id,
        clubIndex,
        clubName: club.clubName || `Chủ đề ${clubIndex + 1}`,
        displayName: displayWritingClubName(club.clubName, clubIndex)
      }));
    })
  );
}

function parseQuestionTemplate(content: string) {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed as { template?: string; clubs: Array<{ clubName?: string }> } : null;
  } catch {
    return null;
  }
}

function getWritingTopicColor(index: number) {
  const colors = [
    'bg-amber-400 text-navy',
    'bg-emerald-700 text-white',
    'bg-amber-400 text-navy',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-red-500 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-navy',
    'bg-brand-600 text-white',
    'bg-brand-600 text-white',
    'bg-emerald-700 text-white',
    'bg-cyan-500 text-navy'
  ];
  return colors[index % colors.length];
}

function previewQuestion(question: Question) {
  const directTopic = cleanTopicTitle(question.topic);
  if (directTopic && !isGenericPartTopic(directTopic)) return directTopic;

  try {
    const data = JSON.parse(question.content);
    const topic = cleanTopicTitle(data.topic);
    const value = topic && !isGenericPartTopic(topic)
      ? topic
      : data.title || data.prompt || data.instructions || data.content || question.content;
    return repairMojibake(String(value));
  } catch {
    return repairMojibake(question.content);
  }
}

function cleanTopicTitle(value?: string) {
  if (!value) return '';
  return repairMojibake(value).replace(/^topic:\s*/i, '').trim();
}

function displayWritingClubName(value: string | undefined, index: number) {
  const cleaned = cleanTopicTitle(value);
  if (!cleaned || isTechnicalTopicName(cleaned)) return `Chủ đề ${index + 1}`;
  return cleaned;
}

function isTechnicalTopicName(value: string) {
  return /^[a-z]+(?:_[a-z0-9]+)+$/i.test(value.trim());
}

function isGenericPartTopic(value: string) {
  return /^(reading|listening|grammar|writing|speaking)\s+part\s+\d+$/i.test(value.trim());
}

function displayQuestionMeta(question: Question) {
  const topic = cleanTopicTitle(question.topic);
  const prefix = topic ? `${topic} - ` : '';
  return `${prefix}${POINTS_PER_QUESTION} điểm`;
}


