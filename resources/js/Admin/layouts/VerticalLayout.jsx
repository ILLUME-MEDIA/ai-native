import { Container } from 'react-bootstrap';
import Customizer from '@admin/layouts/components/Customizer';
import Footer from '@admin/layouts/components/Footer';
import Sidenav from '@admin/layouts/components/Sidenav';
import TopBar from '@admin/layouts/components/TopBar';
const VerticalLayout = ({
  children
}) => {
  return <>
      <div className="wrapper">
        <Sidenav />
        <TopBar />
        <div className="content-page">
          <Container fluid>
            {children}
          </Container>
          <Footer />
        </div>
      </div>
      <Customizer />
    </>;
};
export default VerticalLayout;