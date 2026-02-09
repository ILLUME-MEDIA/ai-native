import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import BankAccount from './components/BankAccount';
import BankCard from './components/BankCard';
const Page = () => {
  return <>
      <PageBreadcrumb title="Banks & Cards" subtitle="Finance" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <BankAccount />

              <BankCard />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;