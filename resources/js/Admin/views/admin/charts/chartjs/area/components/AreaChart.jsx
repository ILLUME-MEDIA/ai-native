import ChartJs from '@admin/components/wrappers/ChartJs';
import { Filler, LineController, LineElement, PointElement } from 'chart.js';
import { getBasicAreaChart, getBoundedAreaChart, getDifferentDatasetChart, getDrawTimeChart, getStackedAreaChart } from './data';
export const AreaChartJs = () => {
  return <ChartJs type="line" getOptions={getBasicAreaChart} plugins={[LineController]} height={300} />;
};
export const DifferentDatasetChart = () => {
  return <ChartJs type="line" getOptions={getDifferentDatasetChart} plugins={[LineController]} height={300} />;
};
export const StackedChart = () => {
  return <ChartJs type="line" getOptions={getStackedAreaChart} plugins={[LineController]} height={300} />;
};
export const BoundariesChart = () => {
  return <ChartJs type="line" getOptions={getBoundedAreaChart} plugins={[LineController]} height={300} />;
};
export const DrawTimeChart = () => {
  return <ChartJs type="line" getOptions={getDrawTimeChart} plugins={[LineController, LineElement, PointElement, Filler]} height={300} />;
};