import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { MoneyPipe } from '../pipes/money.pipe';
import { BUSINESS_LABELS } from '../pipes/label.pipe';

export interface HistoryEntry {
  id: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  justification: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

export interface HistoryDialogData {
  title?: string;
  /** Objet concerné (« Terrain T-12 »). */
  subject: string;
  load: () => Observable<{ items: HistoryEntry[] }>;
  /** Libellés des actions techniques (« mandat.created » → « Création du mandat »). */
  actionLabels: Record<string, string>;
  /** Libellés des champs (« prixPublic » → « Prix public »). */
  fieldLabels: Record<string, string>;
  /** Champs affichés en FCFA. */
  moneyFields?: string[];
}

interface Change {
  field: string;
  before: string | null;
  after: string | null;
}

const IGNORED_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

/**
 * Historique d'un objet métier lu depuis le journal d'audit : qui, quand,
 * et ce qui a changé (ancienne → nouvelle valeur), avec la justification.
 * Partagé par toutes les fiches pour une lecture identique partout.
 */
@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title ?? 'Historique des modifications' }}</h2>
    <mat-dialog-content class="history-body">
      <p class="history-intro">
        <strong>{{ data.subject }}</strong> · chaque action est tracée dans le journal d’audit avec son auteur.
      </p>
      @if (loading()) {
        <div class="skeleton" style="height: 56px"></div>
        <div class="skeleton" style="height: 56px"></div>
        <div class="skeleton" style="height: 56px"></div>
      } @else if (errorMessage()) {
        <div class="history-error">{{ errorMessage() }}</div>
      } @else if (history().length === 0) {
        <div class="history-empty">Aucune action enregistrée.</div>
      } @else {
        <ol class="history-list">
          @for (entry of history(); track entry.id) {
            <li class="history-item">
              <div class="history-item__head">
                <strong>{{ actionLabel(entry.action) }}</strong>
                <span>
                  {{ entry.createdAt | date: 'dd/MM/yyyy à HH:mm' }} ·
                  @if (entry.user) {
                    {{ entry.user.firstName }} {{ entry.user.lastName }}
                  } @else {
                    Système
                  }
                </span>
              </div>
              @if (changes(entry); as changes) {
                @if (changes.length) {
                  <dl class="history-changes">
                    @for (change of changes; track change.field) {
                      <div>
                        <dt>{{ change.field }}</dt>
                        <dd>
                          <s>{{ change.before ?? '—' }}</s>
                          <span aria-hidden="true">→</span>
                          <strong>{{ change.after ?? '—' }}</strong>
                        </dd>
                      </div>
                    }
                  </dl>
                }
              }
              @if (entry.justification) {
                <p class="history-item__justification">Justification : {{ entry.justification }}</p>
              }
            </li>
          }
        </ol>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .history-body { display: grid; gap: 10px; max-height: 70vh; min-width: min(560px, calc(100vw - 96px)); }
    .history-intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.84rem; }
    .history-error, .history-empty { padding: 20px; border-radius: 10px; background: var(--mtm-bg-surface); color: var(--mtm-text-muted); text-align: center; font-size: 0.86rem; }
    .history-error { color: var(--mtm-error); }
    .history-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .history-item { padding: 10px 14px; border: 1px solid var(--mtm-border); border-left: 3px solid var(--mtm-primary); border-radius: 8px; }
    .history-item__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 0.86rem; }
    .history-item__head span { color: var(--mtm-text-muted); font-size: 0.78rem; }
    .history-item__justification { margin: 8px 0 0; color: var(--mtm-text-muted); font-size: 0.8rem; font-style: italic; }
    .history-changes { display: grid; gap: 4px; margin: 8px 0 0; font-size: 0.8rem; }
    .history-changes > div { display: grid; grid-template-columns: minmax(120px, 0.6fr) minmax(0, 1.4fr); gap: 8px; }
    .history-changes dt { color: var(--mtm-text-muted); }
    .history-changes dd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .history-changes s, .history-changes dd > span { color: var(--mtm-text-muted); }
  `,
})
export class HistoryDialog {
  private readonly money = new MoneyPipe();
  readonly data = inject<HistoryDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly history = signal<HistoryEntry[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.data.load().subscribe({
      next: (response) => {
        this.history.set(response.items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger l’historique.');
        this.loading.set(false);
      },
    });
  }

  protected actionLabel(action: string): string {
    return this.data.actionLabels[action] ?? action;
  }

  protected changes(entry: HistoryEntry): Change[] {
    const before = this.asRecord(entry.oldValue);
    const after = this.asRecord(entry.newValue);
    const result: Change[] = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (IGNORED_FIELDS.has(key)) continue;
      const b = this.display(key, before[key]);
      const a = this.display(key, after[key]);
      if (b === a) continue;
      result.push({ field: this.data.fieldLabels[key] ?? key, before: b, after: a });
    }
    return result;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private display(key: string, value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (this.data.moneyFields?.includes(key)) return this.money.transform(value as number | string);
    if (typeof value === 'string') {
      if (/^d{4}-d{2}-d{2}T/.test(value)) return new Date(value).toLocaleDateString('fr-FR');
      return BUSINESS_LABELS[value] ?? value;
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  static open(dialog: MatDialog, data: HistoryDialogData): MatDialogRef<HistoryDialog> {
    return dialog.open(HistoryDialog, { width: '720px', maxWidth: 'calc(100vw - 32px)', data });
  }
}
