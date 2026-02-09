import ChartJs from '@admin/components/wrappers/ChartJs';
import { BarController, BarElement } from 'chart.js';
import { getBasicBarChart, getBorderRadiusBarChart, getFloatingBarChart, getHorizontalBarChart, getStackedBarChart, getStackedGroupedBarChart, getVerticalBarChart } from './data';
export const BasicBarChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getBasicBarChart} plugins={[BarController, BarElement]} />;
};
export const BorderReducedBarChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getBorderRadiusBarChart} plugins={[BarController, BarElement]} />;
};
export const FloatingChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getFloatingBarChart} plugins={[BarController, BarElement]} />;
};
export const HorizontalChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getHorizontalBarChart} plugins={[BarController, BarElement]} />;
};
export const StackedChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getStackedBarChart} plugins={[BarController, BarElement]} />;
};
export const StackedwithGroupsChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getStackedGroupedBarChart} plugins={[BarController, BarElement]} />;
};
export const VerticalChart = () => {
  return <ChartJs height={300} type="bar" getOptions={getVerticalBarChart} plugins={[BarController, BarElement]} />;
};