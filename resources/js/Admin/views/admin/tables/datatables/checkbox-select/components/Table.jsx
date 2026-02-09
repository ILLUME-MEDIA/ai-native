import DT from 'datatables.net-bs5';
import DataTable from 'datatables.net-react';
import 'datatables.net-responsive';
import 'datatables.net-select';
import { useEffect, useRef } from 'react';
import { paginationIcons, tableData } from '../../data';
const columns = [{
  data: null,
  orderable: false,
  className: 'select-checkbox text-start',
  render: function () {
    return '';
  }
}, {
  data: 'company'
}, {
  data: 'symbol'
}, {
  data: 'price',
  render: data => {
    return `${data}`;
  },
  className: 'text-start'
}, {
  data: 'change',
  render: data => {
    return `${data}%`;
  },
  className: 'text-start'
}, {
  data: 'volume',
  className: 'text-start'
}, {
  data: 'marketCap',
  render: data => {
    return `${data}`;
  }
}, {
  data: 'rating',
  render: data => {
    return `${data}★`;
  }
}, {
  data: 'status',
  render: data => {
    const badgeClass = data === 'Bullish' ? 'success' : 'danger';
    return `<span class="badge badge-label badge-soft-${badgeClass}">${data}</span>`;
  }
}];
const Table = () => {
  DataTable.use(DT);
  const tableRef = useRef(null);
  const selectAllRef = useRef(null);
  useEffect(() => {
    if (tableRef.current && selectAllRef.current) {
      selectAllRef.current.addEventListener('change', () => {
        if (selectAllRef.current?.checked) {
          tableRef.current?.dt()?.rows({
            search: 'applied'
          }).select();
        } else {
          tableRef.current?.dt()?.rows().deselect();
        }
      });
      tableRef.current?.dt()?.on('select deselect', function () {
        const totalRows = tableRef.current?.dt()?.rows({
          search: 'applied'
        }).count();
        const selectedRows = tableRef.current?.dt()?.rows({
          selected: true,
          search: 'applied'
        }).count();
        if (selectAllRef.current) {
          selectAllRef.current.checked = selectedRows === totalRows;
        }
      });
    }
  }, []);
  return <>
      <DataTable ref={tableRef} data={tableData.body} columns={columns} options={{
      select: {
        style: 'multi',
        selector: 'td:first-child',
        className: 'selected'
      },
      order: [[1, 'asc']],
      responsive: true,
      columnDefs: [{
        orderable: false,
        render: DT.render.select(),
        targets: 0
      }],
      language: {
        paginate: paginationIcons
      }
    }} className="table table-striped dt-responsive dt-select-checkbox align-middle mb-0">
        <thead className="thead-sm text-uppercase fs-xxs">
          <tr>
            <th className="fs-sm">
              <input ref={selectAllRef} type="checkbox" className="form-check-input" />
            </th>
            <th>Company</th>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>Volume</th>
            <th>Market Cap</th>
            <th>Rating</th>
            <th>Status</th>
          </tr>
        </thead>
      </DataTable>
    </>;
};
export default Table;