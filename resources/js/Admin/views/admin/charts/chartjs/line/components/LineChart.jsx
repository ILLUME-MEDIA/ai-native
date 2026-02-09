import ChartJs from '@admin/components/wrappers/ChartJs';
import { Filler, LineController, LineElement, PointElement } from 'chart.js';
import { getBasicLineChart, getInterpolationLineChart, getLineSegmentsChart, getMultiAxisLineChart, getPointStyleLineChart, getSteppedLineChart } from './data';
export const BasicLineChart = () => {
  return <ChartJs height={300} type="line" getOptions={getBasicLineChart} plugins={[LineController, PointElement, LineElement, Filler]} />;
};
export const InterpolationChart = () => {
  return <ChartJs height={300} type="line" getOptions={getInterpolationLineChart} plugins={[LineController, PointElement, LineElement]} />;
};
export const MultiAxesChart = () => {
  return <ChartJs height={300} type="line" getOptions={getMultiAxisLineChart} plugins={[LineController]} />;
};
export const PointStylingChart = () => {
  return <ChartJs height={300} type="line" getOptions={getPointStyleLineChart} plugins={[LineController]} />;
};
export const LineSegmentChart = () => {
  return <ChartJs height={300} type="line" getOptions={getLineSegmentsChart} plugins={[LineController]} />;
};
export const SteppedChart = () => {
  return <ChartJs height={300} type="line" getOptions={getSteppedLineChart} plugins={[LineController]} />;
};