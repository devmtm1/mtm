import type { EChartsCoreOption } from 'echarts/core';
import type { SourceVisite, TypeFiche } from '../../core/services/api/visites-api.service';

const COULEUR = '#1A4974';
const COULEUR_VUES = '#5EA8C7';
const TEXTE = '#6B7280';
const TRAIT = '#E5E7EB';
const POLICE = "'Plus Jakarta Sans', system-ui, sans-serif";

export const LIBELLES_SOURCE: Record<SourceVisite, string> = {
  direct: 'Accès direct',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  autre: 'Autres sites',
};

/** « 2026-10-25 » → « 25 oct. » */
export function jourCourt(jour: string): string {
  const [, mois, numero] = jour.split('-');
  const noms = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];
  return `${Number(numero)} ${noms[Number(mois) - 1] ?? ''}`.trim();
}

/** Lien vers la fiche d'un bien dans le back-office. */
export function lienFiche(type: TypeFiche, id: string): string[] {
  return type === 'terrain'
    ? ['/terrains', id]
    : type === 'location'
      ? ['/locatif/biens', id]
      : ['/content/showcase'];
}

interface PointJour {
  jour: string;
  a: number;
  b?: number;
}

/** Courbe des visiteurs (et, en option, des pages vues) jour par jour. */
export function courbeJours(
  points: PointJour[],
  options: { nomA: string; nomB?: string; compact?: boolean },
): EChartsCoreOption {
  const avecB = options.nomB !== undefined;
  const pas = Math.max(1, Math.ceil(points.length / (options.compact ? 4 : 8)));
  return {
    color: avecB ? [COULEUR, COULEUR_VUES] : [COULEUR],
    textStyle: { fontFamily: POLICE },
    grid: options.compact
      ? { left: 4, right: 4, top: 8, bottom: 4, containLabel: true }
      : { left: 8, right: 8, top: avecB ? 32 : 16, bottom: 8, containLabel: true },
    ...(avecB
      ? { legend: { top: 0, right: 0, icon: 'circle', textStyle: { color: TEXTE, fontSize: 11 } } }
      : {}),
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const lignes = (Array.isArray(params) ? params : [params]) as {
          dataIndex: number;
          seriesName: string;
          value: number;
        }[];
        const point = points[lignes[0]?.dataIndex ?? 0];
        const corps = lignes
          .map((l) => `${l.seriesName} : <strong>${l.value.toLocaleString('fr-FR')}</strong>`)
          .join('<br/>');
        return `${point ? jourCourt(point.jour) : ''}<br/>${corps}`;
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p) => jourCourt(p.jour)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: TRAIT } },
      axisLabel: { color: TEXTE, fontSize: 11, interval: pas - 1 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: TRAIT, type: 'dashed' } },
      axisLabel: { color: TEXTE, fontSize: 11 },
    },
    series: [
      {
        name: options.nomA,
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        data: points.map((p) => p.a),
        lineStyle: { width: 2.5 },
        areaStyle: { opacity: 0.1 },
      },
      ...(avecB
        ? [
            {
              name: options.nomB,
              type: 'line',
              smooth: 0.25,
              showSymbol: false,
              data: points.map((p) => p.b ?? 0),
              lineStyle: { width: 2, type: 'dashed' as const },
            },
          ]
        : []),
    ],
  };
}
