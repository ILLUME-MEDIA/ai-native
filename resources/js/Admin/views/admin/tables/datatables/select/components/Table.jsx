import CellSelection from './CellSelection';
import MultiItemSelection from './MultiItemSelection';
import SingleItemSelect from './SingleItemSelect';
import { Col } from 'react-bootstrap';
const Table = () => {
  return <>
      <Col xs={12}>
        <SingleItemSelect />
        <MultiItemSelection />
        <CellSelection />
      </Col>
    </>;
};
export default Table;