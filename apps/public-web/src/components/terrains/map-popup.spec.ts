import { describe, expect, it } from 'vitest';
import { popupText } from './map-popup';

describe('popupText', () => {
  it('traite le texte comme du texte, jamais comme du balisage', () => {
    const element = popupText('<img src=x onerror=alert(1)>Villa', true);
    expect(element.tagName).toBe('STRONG');
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toBe('<img src=x onerror=alert(1)>Villa');
  });
});
