import DT from 'datatables.net-bs5';
import DataTable from 'datatables.net-react';
import 'datatables.net-responsive';
import { useRef } from 'react';
import { Button } from 'react-bootstrap';
import { columns, paginationIcons, tableData } from '../../data';
const Table = () => {
  DataTable.use(DT);
  const tableRef = useRef(null);
  return <>
      <Button variant="primary" className="mb-3" onClick={() => tableRef.current?.dt()?.row.add(tableData.body[0]).draw(false)}>
        Add Row
      </Button>
      <DataTable ref={tableRef} data={tableData.body.slice(0, 5)} columns={columns} options={{
      responsive: true,
      language: {
        paginate: paginationIcons
      }
    }} className="table table-striped dt-responsive align-middle mb-0">
        <thead className="thead-sm text-uppercase fs-xxs">
          <tr>
            {tableData.header.map((label, idx) => <th key={idx}>{label}</th>)}
          </tr>
        </thead>
      </DataTable>
    </>;
};
export default Table;