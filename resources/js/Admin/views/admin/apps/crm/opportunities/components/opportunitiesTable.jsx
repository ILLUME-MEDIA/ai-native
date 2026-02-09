import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { Link } from 'react-router';
import { useState } from 'react';
import { Card, CardBody, CardFooter, CardHeader, FormSelect } from 'react-bootstrap';
import { opportunityData } from './data';
const columnHelper = createColumnHelper();
const OpportunitiesTable = () => {
  const columns = [columnHelper.accessor('id', {
    header: 'ID'
  }), columnHelper.accessor('product.name', {
    header: 'Opportunity',
    enableSorting: false,
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded me-2 justify-content-center d-flex align-items-center">
            <img src={row.original.product.image} alt="Product" height="20" />
          </div>
          <div>
            <p className="mb-0 fw-medium">
              <Link to="" className="link-reset">
                {row.original.product.name}
              </Link>
            </p>
            <p className="text-muted mb-0 small">By: {row.original.product.seller}</p>
          </div>
        </div>
  }), columnHelper.accessor('customer.name', {
    header: 'Contact Person',
    enableSorting: false,
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-sm me-2">
            <img src={row.original.customer.image} alt="Product" className="img-fluid rounded-circle" />
          </div>
          <div>
            <p className="mb-0 fw-medium">
              <Link data-sort="product" to="" className="link-reset">
                {row.original.customer.name}
              </Link>
            </p>
            <p className="text-muted mb-0 small">{row.original.customer.email}</p>
          </div>
        </div>
  }), columnHelper.accessor('stage', {
    header: 'Stage',
    enableColumnFilter: true
  }), columnHelper.accessor('amount', {
    header: 'Value(usd)'
  }), columnHelper.accessor('closeDate', {
    header: 'Close Date'
  }), columnHelper.accessor('source', {
    header: 'Lead Source'
  }), columnHelper.accessor('owner', {
    header: 'Owner ',
    enableSorting: false
  }), columnHelper.accessor('status', {
    header: 'Status',
    filterFn: 'equalsString',
    enableColumnFilter: true,
    cell: ({
      row
    }) => <span className={clsx('badge badge-label  fs-xs', row.original.status == 'closed' ? 'badge-soft-danger' : row.original.status == 'in-progress' ? 'badge-soft-warning' : 'badge-soft-success')}>{toPascalCase(row.original.status)}</span>
  }), columnHelper.accessor('priority', {
    header: 'Status',
    filterFn: 'equalsString',
    enableColumnFilter: true,
    cell: ({
      row
    }) => <span className={clsx('badge fs-xs', row.original.priority == 'low' ? 'text-bg-success' : row.original.priority == 'medium' ? 'text-bg-warning' : 'text-bg-danger')}>{toPascalCase(row.original.priority)}</span>
  })];
  const [data, setData] = useState(() => [...opportunityData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input data-table-search type="search" className="form-control" placeholder="Search opportunity..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect value={table.getColumn('stage')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('stage')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Stage</option>
              <option value="Qualification">Qualification</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </FormSelect>
            <Icon icon="circle-check" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect value={table.getColumn('priority')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('priority')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </FormSelect>
            <Icon icon="alert-circle" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect className="form-control my-1 my-md-0" value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        <DataTable table={table} emptyMessage="No records found" />
      </CardBody>

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="Opportunities" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default OpportunitiesTable;