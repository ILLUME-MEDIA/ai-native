import DataTable from 'datatables.net-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import { useEffect, useRef } from 'react';
import { columns, tableData } from '../../data';
const RangeSearch = () => {
  const tableRef = useRef(null);
  const dtRef = useRef(null);
  useEffect(() => {
    if (!tableRef.current || dtRef.current) return;
    DataTable.ext.search.push((_settings, data) => {
      const min = Number(document.getElementById('min')?.value) || 0;
      const max = Number(document.getElementById('max')?.value) || Infinity;
      const price = Number(data[3]) || 0;
      return price >= min && price <= max;
    });
    dtRef.current = new DataTable(tableRef.current, {
      data: tableData.body,
      columns,
      responsive: true,
      paging: true,
      searching: true,
      ordering: true
    });
    return () => {
      DataTable.ext.search.pop();
      dtRef.current?.destroy();
      dtRef.current = null;
    };
  }, []);
  const redrawTable = () => {
    dtRef.current?.draw();
  };
  return <>
      <div className="d-flex align-items-center gap-2 my-2" style={{
      maxWidth: 400
    }}>
        <label className="fw-semibold">Price:</label>
        <input id="min" type="number" className="form-control form-control-sm" placeholder="Min" onKeyUp={redrawTable} />
        <input id="max" type="number" className="form-control form-control-sm" placeholder="Max" onKeyUp={redrawTable} />
      </div>

      <div className="table-responsive">
        <table ref={tableRef} className="table table-striped align-middle w-100">
          <thead>
            <tr>
              {tableData.header.map((h, i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
        </table>
      </div>
    </>;
};
export default RangeSearch;