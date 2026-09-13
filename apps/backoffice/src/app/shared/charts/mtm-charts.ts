import type { EChartsCoreOption } from 'echarts/core';
import { businessLabel } from '../pipes/label.pipe';

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
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k`;
  return value.toLocaleString('fr-FR');
}

export interface MonthlyPoint {
  periode: string;
  valeur: number;
}

/** Histogramme mensuel (encaissements, dossiers créés…). */
export function monthlyBarChart(points: MonthlyPoint[], options: { unit?: 'FCFA' | 'count'; color?: string } = {}): EChartsCoreOption {
  const unit = options.unit ?? 'count';
  const format = (value: number) => (unit === 'FCFA' ? `${value.toLocaleString('fr-FR')} FCFA` : value.toLocaleString('fr-FR'));
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
export function donutChart(distribution: Partial<Record<string, number>>): EChartsCoreOption {
  const data = Object.entries(distribution)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .map(([code, value]) => ({ name: businessLabel(code), value }));
  return {
    color: SERIES_COLORS,
    textStyle: { fontFamily: FONT },
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
