import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Container, Row } from 'react-bootstrap';
import FeedColumn from './components/FeedColumn';
import SocialFeed from './components/SocialFeed';
const Page = () => {
  return <>
      <PageBreadcrumb title="Social" subtitle="Widgets" />
      <Container fluid="xxl">
        <Row>
          <Col xxl="6">
            <SocialFeed />
          </Col>
          <Col xxl="6">
            <FeedColumn />
          </Col>
        </Row>
      </Container>
    </>;
};
export default Page;