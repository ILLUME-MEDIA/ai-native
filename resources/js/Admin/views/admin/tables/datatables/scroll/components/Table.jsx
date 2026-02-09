import VerticalScroll from './VerticalScroll';
import HorizontalScroll from './HorizontalScroll';
import { Col } from 'react-bootstrap';
const Table = () => {
  return <>
      <Col xs="12">
        <VerticalScroll />
        <HorizontalScroll />
      </Col>
    </>;
};
export default Table;