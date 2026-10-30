const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

const environmentParagraphs = [
  {
    en: 'I find the act of giving away old or secondhand items a bit hypocritical. Why do people give away their old things, only to go out and buy the same item but brand new? Not only does this fail to protect the environment, but it also causes double the harm. Personally, I have a way of protecting the environment by not releasing harmful chemicals into it. I do this by not purchasing chemical cleaning solutions. Instead, I make use of natural products like lemons to create my own floor-cleaning solutions.',
    vi: 'Tôi thấy việc cho đi những món đồ cũ hoặc đã qua sử dụng có phần đạo đức giả. Tại sao mọi người lại cho đi đồ cũ của mình, rồi lại ra ngoài mua đúng món đồ đó nhưng mới tinh? Điều này không những không bảo vệ môi trường mà còn gây hại gấp đôi. Cá nhân tôi có cách bảo vệ môi trường bằng việc không thải các hóa chất độc hại ra môi trường. Tôi làm điều này bằng cách không mua các dung dịch tẩy rửa hóa học. Thay vào đó, tôi sử dụng các sản phẩm tự nhiên như chanh để tự pha dung dịch lau sàn.'
  },
  {
    en: "I often don't have time to think about how to reuse my belongings or clothes, but I don't want to throw them away because that would be wasteful. So, I think a better way is to donate them to charity organizations or give them to others. Many people are in need of these things, and giving away my old items also makes me feel happier because I'm helping others.",
    vi: 'Tôi thường không có thời gian nghĩ cách tái sử dụng đồ dùng hoặc quần áo của mình, nhưng tôi không muốn vứt chúng đi vì như vậy sẽ rất lãng phí. Vì vậy, tôi nghĩ cách tốt hơn là quyên góp chúng cho các tổ chức từ thiện hoặc tặng cho người khác. Nhiều người đang cần những món đồ này, và việc cho đi đồ cũ cũng khiến tôi cảm thấy vui hơn vì mình đang giúp đỡ người khác.'
  },
  {
    en: "A good way to protect the environment is by not using plastic bags or by bringing reusable bags when going to the market, which helps reduce the disposal of plastic bags, a material that is difficult to decompose. However, I'm a very busy person and rarely have time to prepare my own bags when going shopping, and I usually drive to buy groceries quickly instead of walking. I guess I can't protect the environment by not driving. But I have a principle of only buying eco-friendly products, so I think I'm still contributing in a small way to protecting the Earth.",
    vi: 'Một cách tốt để bảo vệ môi trường là không sử dụng túi ni lông hoặc mang theo túi có thể tái sử dụng khi đi chợ. Điều này giúp giảm lượng túi ni lông bị thải bỏ, một loại vật liệu khó phân hủy. Tuy nhiên, tôi rất bận rộn và hiếm khi có thời gian chuẩn bị túi riêng khi đi mua sắm. Tôi cũng thường lái xe đi mua thực phẩm cho nhanh thay vì đi bộ. Tôi nghĩ mình không thể bảo vệ môi trường bằng cách ngừng lái xe. Nhưng tôi có nguyên tắc chỉ mua các sản phẩm thân thiện với môi trường, nên tôi nghĩ mình vẫn đang góp một phần nhỏ vào việc bảo vệ Trái Đất.'
  },
  {
    en: 'I see that too many people are wasting food containers, as they often throw them away after use, such as glass jars or plastic bottles. I can reuse them to store food and neatly organize them in my refrigerator. Reusing these containers is a very easy way to protect the environment that anyone can do.',
    vi: 'Tôi thấy có quá nhiều người đang lãng phí các vật dụng đựng thực phẩm như lọ thủy tinh hoặc chai nhựa, vì họ thường vứt chúng đi sau khi sử dụng. Tôi có thể tái sử dụng chúng để đựng thức ăn và sắp xếp chúng gọn gàng trong tủ lạnh. Tái sử dụng những vật dụng này là một cách rất dễ để bảo vệ môi trường mà ai cũng có thể làm được.'
  }
];

export function getListeningScriptVietnamese(script: string): string {
  const plain = script.replace(/<[^>]*>/g, '');
  const people = [...plain.matchAll(/\bPerson\s+([A-Z]|\d+)\s*:/gi)];
  if (!people.length) return '';
  const translated = people.map((person, index) => {
    const paragraph = plain.slice(person.index! + person[0].length, people[index + 1]?.index ?? plain.length).trim();
    const match = environmentParagraphs.find((item) => normalize(item.en) === normalize(paragraph));
    return match ? `Người ${person[1]}: ${match.vi}` : '';
  });
  return translated.every(Boolean) ? translated.join('\n\n') : '';
}

// Verified excerpts and translations for the environment listening exercise.
const environmentEvidence = [
  {
    answer: /(?:commercial|chemical).*cleaning|cleaning.*products/i,
    sentence: 'I do this by not purchasing chemical cleaning solutions.',
    vi: 'Tôi làm điều này bằng cách không mua các dung dịch tẩy rửa hóa học.'
  },
  {
    answer: /give away|donat/i,
    sentence: 'So, I think a better way is to donate them to charity organizations or give them to others.',
    vi: 'Vì vậy, tôi nghĩ cách tốt hơn là quyên góp chúng cho các tổ chức từ thiện hoặc tặng cho người khác.'
  },
  {
    answer: /environmentally friendly|eco-friendly/i,
    sentence: "But I have a principle of only buying eco-friendly products, so I think I'm still contributing in a small way to protecting the Earth.",
    vi: 'Nhưng tôi có nguyên tắc chỉ mua các sản phẩm thân thiện với môi trường, nên tôi nghĩ mình vẫn đang góp một phần nhỏ vào việc bảo vệ Trái Đất.'
  },
  {
    answer: /reuse.*containers|containers.*food/i,
    sentence: 'I can reuse them to store food and neatly organize them in my refrigerator.',
    vi: 'Tôi có thể tái sử dụng chúng để đựng thức ăn và sắp xếp chúng gọn gàng trong tủ lạnh.'
  }
];

export function getListeningPersonEvidence(script: string, index: number, answer: string, translations?: unknown) {
  const plain = script.replace(/<[^>]*>/g, '');
  const people = [...plain.matchAll(/\bPerson\s+([A-Z]|\d+)\s*:/gi)];
  const person = people.find((match) => match[1].toUpperCase() === String.fromCharCode(65 + index) || match[1] === String(index + 1));
  if (!person) return { en: '', vi: '' };
  const position = people.indexOf(person);
  const paragraph = plain.slice(person.index! + person[0].length, people[position + 1]?.index ?? plain.length).trim();
  const verified = environmentEvidence.find((item) => item.answer.test(answer) && normalize(paragraph).includes(normalize(item.sentence)));
  if (verified) {
    // Copy the source wording, including its original apostrophes.
    const start = normalize(paragraph).indexOf(normalize(verified.sentence));
    const en = paragraph.replace(/\s+/g, ' ').slice(start, start + verified.sentence.length);
    return { en, vi: verified.vi };
  }
  // Prefer the complete speaker paragraph when no verified excerpt is available.
  let vi = '';
  if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
    const map = translations as Record<string, unknown>;
    const value = map[paragraph] ?? map[normalize(paragraph)];
    if (typeof value === 'string') vi = value;
  } else if (Array.isArray(translations)) {
    const entry = translations.find((item) => item && typeof item === 'object'
      && normalize(String(item.source ?? item.en ?? item.text ?? '')) === normalize(paragraph));
    if (entry) vi = String(entry.vi ?? entry.translation ?? entry.vn ?? '');
  }
  return { en: paragraph, vi };
}
