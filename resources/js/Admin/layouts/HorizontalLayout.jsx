import Customizer from '@admin/layouts/components/Customizer';
import Footer from '@admin/layouts/components/Footer';
import TopBar from '@admin/layouts/components/TopBar';
import { Container } from 'react-bootstrap';
import ResponsiveNav from './components/ResponsiveNav';
const HorizontalLayout = ({
  children
}) => {
  return <>
      <div className="wrapper">
        <TopBar />
        <ResponsiveNav />
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
export default HorizontalLayout;