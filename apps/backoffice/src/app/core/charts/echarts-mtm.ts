/**
 * ECharts allégé : seuls les types de graphiques et les composants réellement utilisés par le back-office sont embarqués
 * (barres, courbes, secteurs ; grille, légende, info-bulle, titre). `import('echarts')` chargeait toute la bibliothèque,
 * environ 1,1 Mo de code, dès la première page avec un graphique. Pour employer un autre type (radar, jauge…), l'ajouter ici.
 */
import { use } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, LabelLayout, CanvasRenderer]);

export * from 'echarts/core';
