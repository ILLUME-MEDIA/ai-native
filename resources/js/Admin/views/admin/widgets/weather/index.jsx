import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import SummaryCard from './components/SummaryCard';
import TopCitiesWeather from './components/TopCitiesWeather';
import WeatherByCountry from './components/WeatherByCountry';
import WeatherForecast from './components/WeatherForecast';
import WeatherOverviewCard from './components/WeatherOverviewCard';
const Page = () => {
  return <>
      <PageBreadcrumb title="Weather" subtitle="Widgets" />

      <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2 text-center align-items-center">
        <WeatherForecast />
      </Row>

      <Row>
        <SummaryCard />
      </Row>

      <Row>
        <Col xxl="4" xl="12">
          <TopCitiesWeather />
        </Col>
        <Col xxl="4" xl="6">
          <WeatherByCountry />
        </Col>
        <Col xxl="4" xl="6">
          <WeatherOverviewCard />
        </Col>
      </Row>
    </>;
};
export default Page;