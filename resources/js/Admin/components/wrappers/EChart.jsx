import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { useMemo } from 'react';
import { useLayoutContext } from '@admin/context/useLayoutContext';
let extensionsRegistered = false;
const EChart = ({
  getOptions,
  extensions,
  ...props
}) => {
  if (!extensionsRegistered) {
    echarts.use(extensions);
    extensionsRegistered = true;
  }
  const {
    skin,
    theme
  } = useLayoutContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => typeof window !== 'undefined' && getOptions(), [getOptions, skin, theme]);
  return <ReactECharts echarts={echarts} {...props} option={options} />;
};
export default EChart;