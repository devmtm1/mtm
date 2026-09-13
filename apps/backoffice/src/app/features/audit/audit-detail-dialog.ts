import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { auditActionLabel, entityLabel, fieldLabel } from '../admin/admin-labels';
import { businessLabel } from '../../shared/pipes/label.pipe';
import type { AuditLogItem } from '../../core/models/audit.model';

/** Une ligne du comparatif ancienne / nouvelle valeur. */
interface DiffRow {
  key: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

const MASKED_KEYS = /password|secret|token|otp/i;

/** Traduit un code technique (statut, type…) ou une date ISO en texte lisible. */
function pretty(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return new Date(value).toLocaleString('fr-FR');
  if (/^[a-z][a-z0-9_]*$/.test(value)) {
    const label = businessLabel(value);
    return label === '—' ? value : label;
  }
  return value;
}

/** Aplatit un objet en chemins `a.b.c` pour comparer deux instantanés champ par champ. */
function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (value === null || value === undefined) return out;
  if (typeof value !== 'object' || value instanceof Date) {
    out[prefix || 'valeur'] = String(value);
    return out;
  }
  if (Array.isArray(value)) {
    out[prefix || 'valeur'] = value.length === 0 ? '[]' : value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child) && !(child instanceof Date)) flatten(child, path, out);
    else flatten(child, path, out);
  }
  return out;
}

/**
 * Détail d'une entrée du journal d'audit (section 24 CDC) : qui, quand,
 * depuis où, pourquoi (justification) et surtout l'ancienne et la nouvelle
 * valeur, champ par champ, avec les changements mis en évidence.
 */
@Component({
  selector: 'app-audit-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ actionLabel(entry.action) }}<small class="audit-detail__code">{{ entry.action }}</small></h2>
    <mat-dialog-content class="audit-detail">
      <dl class="audit-detail__meta">
        <div><dt>Date</dt><dd>{{ entry.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</dd></div>
        <div><dt>Qui</dt><dd>{{ entry.user ? entry.user.firstName + ' ' + entry.user.lastName : 'Système (tâche automatique)' }}</dd></div>
        <div><dt>Élément concerné</dt><dd>{{ entityLabel(entry.entityType) }}</dd></div>
        <div><dt>Identifiant</dt><dd class="audit-detail__mono">{{ entry.entityId || '—' }}</dd></div>
        <div><dt>Adresse IP</dt><dd>{{ entry.ipAddress || '—' }}</dd></div>
        <div><dt>Navigateur</dt><dd class="audit-detail__ua">{{ entry.userAgent || '—' }}</dd></div>
      </dl>

      @if (entry.justification) {
        <section class="audit-detail__justification">
          <h3>Justification donnée</h3>
          <p>{{ entry.justification }}</p>
        </section>
      }

      @if (rows.length) {
        <table class="audit-detail__diff">
          <thead>
            <tr><th>Champ</th><th>Avant</th><th>Après</th></tr>
          </thead>
          <tbody>
            @for (row of rows; track row.key) {
              <tr [class.is-changed]="row.changed">
                <td><span>{{ row.label }}</span><small class="audit-detail__mono">{{ row.key }}</small></td>
                <td>{{ row.before }}</td>
                <td>{{ row.after }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="audit-detail__empty">Aucun changement de valeur enregistré pour cette action (consultation, connexion ou suppression).</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .audit-detail { display: grid; gap: 16px; min-width: min(720px, 90vw); }
    .audit-detail__code { display: block; margin-top: 2px; color: var(--mtm-text-muted); font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 0.7rem; font-weight: 400; }
    .audit-detail__meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 20px; margin: 0; }
    .audit-detail__meta div { display: grid; gap: 2px; }
    .audit-detail__meta dt { color: var(--mtm-text-muted); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
    .audit-detail__meta dd { margin: 0; color: var(--mtm-text-dark); font-size: 0.86rem; overflow-wrap: anywhere; }
    .audit-detail__mono { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 0.78rem; }
    .audit-detail__ua { font-size: 0.74rem; color: var(--mtm-text-muted); }
    .audit-detail__justification { padding: 12px 14px; border-left: 3px solid var(--mtm-primary); border-radius: 6px; background: var(--mtm-primary-subtle); }
    .audit-detail__justification h3 { margin: 0 0 4px; font-size: 0.78rem; font-weight: 700; color: var(--mtm-primary); }
    .audit-detail__justification p { margin: 0; font-size: 0.86rem; color: var(--mtm-text-dark); }
    .audit-detail__diff { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .audit-detail__diff th { padding: 8px 10px; text-align: left; color: var(--mtm-text-muted); font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 1px solid var(--mtm-border); }
    .audit-detail__diff td { padding: 8px 10px; vertical-align: top; border-bottom: 1px solid var(--mtm-border); overflow-wrap: anywhere; }
    .audit-detail__diff td small { display: block; color: var(--mtm-text-muted); }
    .audit-detail__diff tr.is-changed td { background: var(--mtm-warning-bg); }
    .audit-detail__diff tr.is-changed td:nth-child(3) { font-weight: 600; color: var(--mtm-text-dark); }
    .audit-detail__empty { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; }
  `,
})
export class AuditDetailDialog {
  readonly entry = inject<AuditLogItem>(MAT_DIALOG_DATA);
  readonly actionLabel = auditActionLabel;
  readonly entityLabel = entityLabel;
  readonly rows: DiffRow[] = this.buildRows();

  private buildRows(): DiffRow[] {
    const before = flatten(this.entry.oldValue);
    const after = flatten(this.entry.newValue);
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return keys.map((key) => {
      const mask = MASKED_KEYS.test(key);
      const b = key in before ? (mask ? '••••••' : pretty(before[key])) : '—';
      const a = key in after ? (mask ? '••••••' : pretty(after[key])) : '—';
      return { key, label: fieldLabel(key), before: b, after: a, changed: b !== a };
    });
  }
}
