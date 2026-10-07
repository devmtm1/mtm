import { describe, expect, it } from 'vitest';
import { PULL_MAX, PULL_THRESHOLD, pullDistance } from './usePullToRefresh';

describe('pullDistance', () => {
  it('ne bouge pas quand le doigt remonte ou reste en place', () => {
    expect(pullDistance(0)).toBe(0);
    expect(pullDistance(-30)).toBe(0);
  });

  it('suit le doigt à moitié', () => {
    expect(pullDistance(80)).toBe(40);
  });

  it('plafonne, et le seuil demande un vrai tirage', () => {
    expect(pullDistance(1000)).toBe(PULL_MAX);
    expect(pullDistance(100)).toBeLessThan(PULL_THRESHOLD);
    expect(pullDistance(140)).toBeGreaterThanOrEqual(PULL_THRESHOLD);
  });
});
