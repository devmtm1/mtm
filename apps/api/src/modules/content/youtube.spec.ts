import { extraireIdYoutube } from './youtube';

describe('extraireIdYoutube', () => {
  it.each([
    ['https://www.youtube.com/watch?v=LSH6GRjVwho', 'LSH6GRjVwho'],
    ['https://www.youtube.com/watch?v=LSH6GRjVwho&t=42s', 'LSH6GRjVwho'],
    ['https://youtu.be/LSH6GRjVwho?si=abc', 'LSH6GRjVwho'],
    ['https://m.youtube.com/watch?v=LSH6GRjVwho', 'LSH6GRjVwho'],
    ['https://www.youtube.com/shorts/LSH6GRjVwho', 'LSH6GRjVwho'],
    ['https://www.youtube.com/embed/LSH6GRjVwho', 'LSH6GRjVwho'],
    ['https://www.youtube.com/live/LSH6GRjVwho', 'LSH6GRjVwho'],
    ['youtube.com/watch?v=LSH6GRjVwho', 'LSH6GRjVwho'],
    ['  https://youtu.be/LSH6GRjVwho  ', 'LSH6GRjVwho'],
  ])('reconnaît %s', (lien, attendu) => {
    expect(extraireIdYoutube(lien)).toBe(attendu);
  });

  it.each([
    '',
    'bonjour',
    'https://www.youtube.com/',
    'https://www.youtube.com/watch?v=trop-court',
    'https://exemple.com/watch?v=LSH6GRjVwho',
    'https://youtube.com.pirate.test/watch?v=LSH6GRjVwho',
    'javascript:alert(1)',
  ])('refuse %s', (lien) => {
    expect(extraireIdYoutube(lien)).toBeNull();
  });
});
