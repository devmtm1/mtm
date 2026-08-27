import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'mtm.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mode = signal<ThemeMode>(this.readInitialMode());

  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.dataset['theme'] = mode;
      this.persistMode(mode);
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private readInitialMode(): ThemeMode {
    try {
      const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedMode === 'light' || storedMode === 'dark') return storedMode;
    } catch {
      // Le thème système reste la valeur de repli si le stockage est indisponible.
    }

    const prefersDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark
      ? 'dark'
      : 'light';
  }

  private persistMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Le thème reste actif pour la session en cours.
    }
  }
}
