import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle, FormSelect } from 'react-bootstrap';
import { dealData } from './data';
const columnHelper = createColumnHelper();
const statusMap = {
  paused: {
    label: 'Paused',
    className: 'bg-info-subtle text-info'
  },
  new: {
    label: 'New',
    className: 'text-bg-light'
  },
  'cold-lead': {
    label: 'Cold Lead',
    className: 'bg-warning-subtle text-warning'
  },
  canceled: {
    label: 'Canceled',
    className: 'bg-danger-subtle text-danger'
  },
  'deal-won': {
    label: 'Deal Won',
    className: 'bg-success-subtle text-success'
  }
};
const DealStatus = () => {
  const [data] = useState(() => [...dealData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data;
    return data.filter(d => d.status === statusFilter);
  }, [data, statusFilter]);
  const columns = [columnHelper.accessor('id', {
    header: 'Deal ID',
    cell: ({
      row
    }) => <Link to="#" className="fw-medium text-reset">
          {row.original.id}
        </Link>
  }), columnHelper.accessor('name', {
    header: 'Deal Name',
    cell: ({
      row
    }) => <>
          <div className="avatar-xs d-inline-block me-1">
            <span className={`avatar-title fw-bold rounded-circle ${row.original.className}`}>{row.original.name.charAt(0)}</span>
          </div>
          <Link to="" className="text-reset">
            {row.original.name}
          </Link>
        </>
  }), columnHelper.accessor('company', {
    header: 'Company'
  }), columnHelper.accessor('progress', {
    header: 'Pipeline',
    enableSorting: false,
    cell: ({
      row
    }) => {
      const totalSteps = 5;
      return <div className="d-flex gap-1 progress progress-lg progress-with-border rounded-0">
            {Array.from({
          length: totalSteps
        }).map((_, i) => <div key={i} className={`progress-bar ${i < row.original.progress ? 'bg-success' : 'bg-light'}`} style={{
          width: '20%'
        }} />)}
          </div>;
    }
  }), columnHelper.accessor('date', {
    header: 'Closing Date'
  }), columnHelper.accessor('user', {
    header: 'User Responsible',
    cell: ({
      row
    }) => <>
          <img alt="" src={row.original.user.image} className="avatar-xs rounded-circle me-1" />
          <Link to="" className="text-body fw-medium">
            {row.original.user.name}
          </Link>
        </>
  }), columnHelper.accessor('value', {
    header: 'Deal Value',
    cell: ({
      row
    }) => <div className="text-nowrap">
          {row.original.prefix}
          {row.original.value}
          {row.original.suffix}
        </div>
  }), columnHelper.accessor('status', {
    header: 'Deal Status',
    cell: ({
      row
    }) => {
      const status = statusMap[row.original.status];
      return <span className={`badge p-1 ${status.className}`}>{status.label}</span>;
    }
  }), {
    header: '•••',
    enableSorting: false,
    cell: () => <Link to="#" className="text-muted fs-20">
          <Icon icon="edit" />
        </Link>
  }];
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString'
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <CardTitle as="h4">Deal Status</CardTitle>
        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>
          <div className="app-search">
            <FormSelect className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Deal Status</option>
              <option value="paused">Paused</option>
              <option value="new">New</option>
              <option value="cold-lead">Cold Lead</option>
              <option value="canceled">Canceled</option>
              <option value="deal-won">Deal Won</option>
            </FormSelect>
            <Icon icon="briefcase" className="app-search-icon text-muted" />
          </div>
          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search deals..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <div>
            <select className="form-select form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </select>
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No deals found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="deals" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default DealStatus;