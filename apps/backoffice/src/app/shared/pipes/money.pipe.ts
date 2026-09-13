import { Pipe, PipeTransform } from '@angular/core';

/**
 * Montant en FCFA, format français (« 12 500 000 FCFA »), « — » si absent.
 * Les montants arrivent de l'API tantôt en nombre, tantôt en chaîne
 * (Decimal Prisma sérialisé) : les deux sont acceptés.
 */
@Pipe({ name: 'mtmMoney', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const amount = Number(value);
    return Number.isFinite(amount) ? `${amount.toLocaleString('fr-FR')} FCFA` : '—';
  }
}
