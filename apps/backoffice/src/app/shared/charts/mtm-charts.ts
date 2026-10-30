import type { EChartsCoreOption } from 'echarts/core';
import { businessLabel } from '../pipes/label.pipe';
import { nombreFr } from '../../core/utils/format';

/**
 * Options ECharts prêtes à l'emploi, alignées sur la charte MTM (bleu marine,
 * rouge carmin, bleu clair) et en français. Centralisé pour que tous les
 * graphiques du back-office aient la même lecture.
 */
const SERIES_COLORS = ['#1A4974', '#B52C36', '#5EA8C7', '#2C6499', '#83191D', '#047857', '#B45309'];
const TEXT_COLOR = '#6B7280';
const GRID_LINE = '#E5E7EB';
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 2026-09 » → « sept. 2026 ». */
export function periodeLabel(periode: string): string {
  const [year, month] = periode.split('-');
  const index = Number(month) - 1;
  return MONTHS_FR[index] ? `${MONTHS_FR[index]} ${year}` : periode;
}

/** Libellé d'axe court : le mois seul, l'année uniquement en janvier (ou sur le premier point). */
function axisLabel(periode: string, first: boolean): string {
  const [year, month] = periode.split('-');
  const index = Number(month) - 1;
  if (!MONTHS_FR[index]) return periode;
  return index === 0 || first ? `${MONTHS_FR[index]} ${year.slice(2)}` : MONTHS_FR[index];
}

function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${nombreFr((value / 1_000_000), { maximumFractionDigits: 1 })} M`;
  if (Math.abs(value) >= 1_000) return `${nombreFr((value / 1_000), { maximumFractionDigits: 0 })} k`;
  return nombreFr(value);
}

export interface MonthlyPoint {
  periode: string;
  valeur: number;
}

/** Histogramme mensuel (encaissements, dossiers créés…). */
export function monthlyBarChart(points: MonthlyPoint[], options: { unit?: 'FCFA' | 'count'; color?: string } = {}): EChartsCoreOption {
  const unit = options.unit ?? 'count';
  const format = (value: number) => (unit === 'FCFA' ? `${nombreFr(value)} FCFA` : nombreFr(value));
  return {
    color: [options.color ?? SERIES_COLORS[0]],
    textStyle: { fontFamily: FONT },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const first = (Array.isArray(params) ? params[0] : params) as { dataIndex: number; value: number };
        const point = points[first.dataIndex];
        return `${point ? periodeLabel(point.periode) : ''}<br/><strong>${format(first.value)}</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((point, index) => axisLabel(point.periode, index === 0)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: GRID_LINE } },
      axisLabel: { color: TEXT_COLOR, fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID_LINE, type: 'dashed' } },
      axisLabel: { color: TEXT_COLOR, fontSize: 11, formatter: (value: number) => compactNumber(value) },
      minInterval: unit === 'count' ? 1 : undefined,
    },
    series: [
      {
        type: 'bar',
        data: points.map((point) => point.valeur),
        barMaxWidth: 36,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
    ],
  };
}

/** Répartition (dossiers par statut, lots par état…) en anneau, libellés français. */
export function donutChart(
  distribution: Partial<Record<string, number>>,
  options: { centre?: string } = {},
): EChartsCoreOption {
  const data = Object.entries(distribution)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .map(([code, value]) => ({ name: businessLabel(code), value }));
  const total = data.reduce((somme, part) => somme + part.value, 0);
  return {
    color: SERIES_COLORS,
    textStyle: { fontFamily: FONT },
    // Le total au centre de l'anneau : sinon un seul groupe donne un disque plein qui ne dit rien.
    ...(options.centre
      ? {
          title: {
            text: nombreFr(total),
            subtext: options.centre,
            left: 'center',
            top: '31%',
            itemGap: 2,
            textStyle: { fontFamily: FONT, fontSize: 28, fontWeight: 700, color: '#1F2937' },
            subtextStyle: { fontFamily: FONT, fontSize: 12, color: TEXT_COLOR },
          },
        }
      : {}),
    tooltip: { trigger: 'item', formatter: '{b} : {c} ({d} %)' },
    legend: { bottom: 0, left: 'center', icon: 'circle', textStyle: { color: TEXT_COLOR, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { show: false },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
        data,
      },
    ],
  };
}

export interface PointRevenuDepenses {
  periode: string;
  revenu: number;
  depenses: number;
}

/** Revenu et dépenses mois par mois, côte à côte (pilotage financier). */
export function revenuDepensesChart(points: PointRevenuDepenses[]): EChartsCoreOption {
  const format = (value: number) => `${nombreFr(Math.round(value))} FCFA`;
  return {
    color: ['#1A4974', '#B52C36'],
    textStyle: { fontFamily: FONT },
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    legend: { top: 0, right: 0, icon: 'circle', textStyle: { color: TEXT_COLOR, fontSize: 11 } },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const lignes = (Array.isArray(params) ? params : [params]) as { dataIndex: number; seriesName: string; value: number }[];
        const point = points[lignes[0]?.dataIndex ?? 0];
        const corps = lignes.map((ligne) => `${ligne.seriesName} : <strong>${format(ligne.value)}</strong>`).join('<br/>');
        return `${point ? periodeLabel(point.periode) : ''}<br/>${corps}`;
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((point, index) => axisLabel(point.periode, index === 0)),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: GRID_LINE } },
      axisLabel: { color: TEXT_COLOR, fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID_LINE, type: 'dashed' } },
      axisLabel: { color: TEXT_COLOR, fontSize: 11, formatter: (value: number) => compactNumber(value) },
    },
    series: [
      { name: 'Revenu MTM', type: 'bar', data: points.map((p) => p.revenu), barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0] } },
      { name: 'Dépenses', type: 'bar', data: points.map((p) => p.depenses), barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0] } },
    ],
  };
}

/** Anneau à partir de libellés déjà écrits en clair (et non de codes à traduire). */
export function donutLibelles(items: { label: string; valeur: number }[]): EChartsCoreOption {
  return {
    color: SERIES_COLORS,
    textStyle: { fontFamily: FONT },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `${p.name}<br/><strong>${nombreFr(Math.round(p.value))} FCFA</strong> (${p.percent} %)`;
      },
    },
    legend: { bottom: 0, left: 'center', icon: 'circle', textStyle: { color: TEXT_COLOR, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '42%'],
        label: { show: false },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
        data: items.map((item) => ({ name: item.label, value: item.valeur })),
      },
    ],
  };
}
