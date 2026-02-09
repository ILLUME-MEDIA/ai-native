import ReactApexCharts from "react-apexcharts";
import { useMemo } from "react";
import { useLayoutContext } from "@admin/context/useLayoutContext";
const ApexChart = ({
  type,
  height,
  width = "100%",
  getOptions,
  series,
  className
}) => {
  const {
    skin,
    theme
  } = useLayoutContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getOptions(), [skin, theme, getOptions]);
  return <ReactApexCharts type={type ?? options.chart?.type} height={height} width={width} options={options} series={series ?? options.series} className={`apex-charts ${className ?? ""}`} />;
};
export default ApexChart;