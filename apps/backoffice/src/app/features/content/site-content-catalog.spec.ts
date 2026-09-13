import { NEWS_KEY_PATTERN, SITE_CONTENT_SECTIONS, slotByKey } from './site-content-catalog';

describe('site-content-catalog', () => {
  it('retrouve un emplacement par sa clé', () => {
    expect(slotByKey('home.hero.title')?.label).toBe('Titre principal');
    expect(slotByKey('inconnu')).toBeUndefined();
  });

  it('ne déclare chaque clé qu’une fois', () => {
    const keys = SITE_CONTENT_SECTIONS.flatMap((section) => section.slots.map((slot) => slot.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reconnaît les clés d’actualités', () => {
    expect(NEWS_KEY_PATTERN.exec('news.3.excerpt')?.slice(1)).toEqual(['3', 'excerpt']);
    expect(NEWS_KEY_PATTERN.test('news.title')).toBe(false);
  });
});
