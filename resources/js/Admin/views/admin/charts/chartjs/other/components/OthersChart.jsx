import ChartJs from '@admin/components/wrappers/ChartJs';
import { ArcElement, BarController, BarElement, BubbleController, DoughnutController, Filler, LineController, LineElement, PieController, PointElement, PolarAreaController, RadarController, RadialLinearScale, ScatterController } from 'chart.js';
import { getBubbleChart, getComboBarLineChart, getDoughnutChart, getMultiPieChart, getPieChart, getPolarAreaChart, getRadarChart, getScatterChart, getStackedBarLineChart } from './data';
export const Bubblechart = () => {
  return <ChartJs height={300} type="bubble" getOptions={getBubbleChart} plugins={[BubbleController, PointElement]} />;
};
export const ComboBarLineChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getComboBarLineChart} plugins={[BarController, LineController, PointElement, LineElement, BarElement]} />;
};
export const StackedBarLineChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getStackedBarLineChart} plugins={[BarController, LineController, PointElement, LineElement, BarElement]} />;
};
export const DoughnutChart = () => {
  return <ChartJs type="doughnut" getOptions={getDoughnutChart} height={300} plugins={[DoughnutController, PointElement, ArcElement]} />;
};
export const PieChart = () => {
  return <ChartJs type="pie" getOptions={getPieChart} height={300} plugins={[PieController, PointElement, ArcElement]} />;
};
export const MultiPieChart = () => {
  return <ChartJs type="pie" getOptions={getMultiPieChart} height={300} plugins={[PieController, PointElement, ArcElement]} />;
};
export const PolarAreaChart = () => {
  return <ChartJs height={300} type="polarArea" getOptions={getPolarAreaChart} plugins={[PolarAreaController, RadialLinearScale, ArcElement]} />;
};
export const RadarChart = () => {
  return <ChartJs height={300} type="radar" getOptions={getRadarChart} plugins={[RadarController, Filler]} />;
};
export const ScatterChart = () => {
  return <ChartJs height={300} type="scatter" getOptions={getScatterChart} plugins={[ScatterController, PointElement]} />;
};