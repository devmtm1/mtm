import { Pipe, PipeTransform } from '@angular/core';

/** Date courte française (« 12/09/2026 »), « — » si absente. */
@Pipe({ name: 'mtmDate', standalone: true })
export class ShortDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
  }
}
