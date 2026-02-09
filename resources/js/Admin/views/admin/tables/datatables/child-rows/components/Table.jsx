import Icon from '@admin/components/wrappers/Icon';
import DT from 'datatables.net-bs5';
import DataTable from 'datatables.net-react';
import 'datatables.net-responsive';
import { useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { paginationIcons, tableData } from '../../data';
const formatRowDetails = d => {
  return `
    <div class="row align-items-center">
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Rating:</h5>
        <div>${d.rating} ★</div>
      </div>
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Status:</h5>
        <span class="badge badge-label ${d.status === 'bullish' ? 'badge-soft-success' : 'badge-soft-danger'}">${d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
      </div>
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Extra info:</h5>
        <div>Additional details here...</div>
      </div>
    </div>
  `;
};
const columns = [{
  className: 'dt-control',
  orderable: false,
  data: null,
  defaultContent: renderToString(<Icon icon="square-rounded-plus-filled" className="text-primary fs 22" />)
}, {
  data: 'company'
}, {
  data: 'symbol'
}, {
  data: 'price',
  render: data => `${data}`,
  className: 'text-start'
}, {
  data: 'change',
  render: data => `${data}%`,
  className: 'text-start'
}, {
  data: 'volume',
  className: 'text-start'
}, {
  data: 'marketCap',
  render: data => `${data}`
}];
const Table = () => {
  DataTable.use(DT);
  const tableRef = useRef(null);
  useEffect(() => {
    if (!tableRef.current) return;
    const dt = tableRef.current.dt();
    if (!dt) return;
    const handler = function () {
      const tr = this.closest('tr');
      if (!tr) return;
      const row = dt.row(tr);
      if (row.child.isShown()) {
        row.child.hide();
        tr.classList.remove('shown');
        this.innerHTML = renderToString(<Icon icon="square-rounded-plus-filled" className="text-primary fs 22" />);
      } else {
        row.child(formatRowDetails(row.data())).show();
        tr.classList.add('shown');
        this.innerHTML = renderToString(<Icon icon="square-rounded-minus-filled" className="text-primary fs 22" />);
      }
    };
    dt.on('click', 'td.dt-control', handler);
    return () => {
      dt.off('click', 'td.dt-control', handler);
    };
  }, []);
  return <DataTable ref={tableRef} data={tableData.body} columns={columns} options={{
    order: [[1, 'asc']],
    responsive: true,
    language: {
      paginate: paginationIcons
    }
  }} className="table table-striped dt-responsive align-middle mb-0">
      <thead className="thead-sm text-uppercase fs-xxs">
        <tr>
          <th></th>
          <th>Company</th>
          <th>Symbol</th>
          <th>Price</th>
          <th>Change</th>
          <th>Volume</th>
          <th>Market Cap</th>
        </tr>
      </thead>
    </DataTable>;
};
export default Table;