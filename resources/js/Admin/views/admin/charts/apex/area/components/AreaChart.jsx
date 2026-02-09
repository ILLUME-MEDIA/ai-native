import ApexChart from "@admin/components/wrappers/ApexChart";
import { META_DATA } from "@admin/config/constants";
import { useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import { datetimeData, getAreaChartDateTimeChart, getAreaChartWithNullValues, getAreaSelectionGithubChart, getAreaSelectionGithubChart2, getAreaTimeSeriesChart, getAreaWithNegativeChart, getBasicAreaChart, getSplineAreaChart, getStackedAreaChart, githubSeries } from "./data";
export const BasicAreaChart = () => {
  return <ApexChart getOptions={getBasicAreaChart} series={getBasicAreaChart().series} type="area" height={380} />;
};
export const SplineAreaChart = () => {
  return <ApexChart getOptions={getSplineAreaChart} series={getSplineAreaChart().series} type="area" height={380} />;
};
export const AreaChartDatetime = () => {
  const [filteredData, setFilteredData] = useState(datetimeData);
  const [activeRange, setActiveRange] = useState("1Y");
  const filterChartRange = range => {
    const now = new Date(datetimeData[datetimeData.length - 1][0]);
    let fromDate;
    switch (range) {
      case "1M":
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case "6M":
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 6);
        break;
      case "1Y":
        fromDate = new Date(now);
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      case "YTD":
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        fromDate = new Date(datetimeData[0][0]);
    }
    const filtered = datetimeData.filter(point => point[0] >= fromDate.getTime());
    setFilteredData(filtered);
    setActiveRange(range);
  };
  return <>
      <div className="toolbar apex-toolbar" style={{
      display: "flex",
      gap: "4px"
    }}>
        {["1M", "6M", "1Y", "YTD", "ALL"].map(range => <Button variant="light" size="sm" key={range} className={activeRange === range ? "active" : ""} onClick={() => filterChartRange(range)}>
            {range}
          </Button>)}
      </div>
      <ApexChart getOptions={() => getAreaChartDateTimeChart(filteredData)} series={[{
      name: META_DATA.name,
      data: filteredData
    }]} type="area" height={350} />
    </>;
};
export const AreawithNegativeValues = () => {
  return <ApexChart getOptions={getAreaWithNegativeChart} series={getAreaWithNegativeChart().series} type="area" height={380} />;
};
export const SelectionGithubStyle = () => {
  const options = useMemo(() => getAreaSelectionGithubChart(), []);
  return <ApexChart getOptions={() => options} series={githubSeries} type="area" height={200} />;
};
export const SelectionGithubStyle2 = () => {
  const options = useMemo(() => getAreaSelectionGithubChart2(), []);
  return <ApexChart getOptions={() => options} series={githubSeries} type="area" height={175} />;
};
export const StackedAreaChart = () => {
  return <ApexChart getOptions={getStackedAreaChart} series={getStackedAreaChart().series} type="area" height={422} />;
};
export const IrregularTimeSeries = () => {
  return <ApexChart getOptions={getAreaTimeSeriesChart} series={getAreaTimeSeriesChart().series} type="area" height={350} />;
};
export const AreaWithNullValues = () => {
  return <ApexChart getOptions={getAreaChartWithNullValues} series={getAreaChartWithNullValues().series} type="area" height={350} />;
};