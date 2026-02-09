import BaseVectorMap from '@admin/components/maps/BaseVectorMap';
import 'jsvectormap';
import 'jsvectormap/dist/maps/spain';
import { getSpainMapOptions } from './data';
const SpainVectorMap = () => {
  return <BaseVectorMap id="spain-map" options={getSpainMapOptions()} style={{
    height: 360
  }} />;
};
export default SpainVectorMap;