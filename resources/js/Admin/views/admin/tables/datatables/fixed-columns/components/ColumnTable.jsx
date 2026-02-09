import DT from 'datatables.net-bs5';
import 'datatables.net-fixedcolumns-bs5';
import DataTable from 'datatables.net-react';
import 'datatables.net-responsive-bs5';
import { useEffect } from 'react';
import { Card, CardBody } from 'react-bootstrap';
import { paginationIcons } from '../../data';
import { columns, companies } from './data';
const ColumnTable = () => {
  DataTable.use(DT);
  useEffect(() => {
    setTimeout(() => {
      const tables = document.querySelectorAll('.dataTable');
      tables.forEach(tbl => {
        if (tbl.api) tbl.api().columns.adjust().draw(false);
      });
    }, 300);
  }, []);
  return <>
      <Card>
        <CardBody className="p-0">
          <DataTable data={companies} columns={columns} options={{
          scrollX: true,
          scrollCollapse: true,
          paging: true,
          pageLength: 10,
          ordering: true,
          responsive: false,
          fixedColumns: {
            leftColumns: 1,
            rightColumns: 1
          },
          language: {
            paginate: paginationIcons
          }
        }} className="table table-striped align-middle mb-0 w-100" />
        </CardBody>
      </Card>
    </>;
};
export default ColumnTable;