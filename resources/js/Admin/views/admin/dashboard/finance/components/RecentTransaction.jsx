import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle, FormSelect } from 'react-bootstrap';
import { transactionData } from './data';
const columnHelper = createColumnHelper();
const RecentTransaction = () => {
  const [data] = useState(() => [...transactionData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const columns = [columnHelper.accessor('id', {
    header: 'ID',
    cell: ({
      getValue
    }) => <Link to="#" className="fw-medium text-reset">
          {getValue()}
        </Link>
  }), columnHelper.accessor('user', {
    header: 'Name / Business',
    cell: ({
      row
    }) => {
      const {
        user
      } = row.original;
      return <div className="d-flex align-items-center gap-2">
            {user.image ? <img src={user.image} alt="" width={24} height={24} className="rounded-circle" /> : <div className="avatar-xs">
                <span className={`avatar-title rounded-circle fw-semibold ${user.className}`}>{user.name.charAt(0)}</span>
              </div>}
            <span>{user.name}</span>
          </div>;
    }
  }), columnHelper.accessor('description', {
    header: 'Description'
  }), columnHelper.accessor('amount', {
    header: 'Amount',
    cell: ({
      row
    }) => <span className={row.original.type === 'credit' ? 'text-success' : 'text-danger'}>{row.original.amount}</span>
  }), columnHelper.accessor('date', {
    header: 'Timestamp',
    cell: ({
      row
    }) => <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
  }), columnHelper.accessor('type', {
    header: 'Type',
    cell: ({
      getValue
    }) => getValue() === 'credit' ? 'Credit' : 'Debit'
  }), columnHelper.accessor('Payment', {
    header: 'Payment Method',
    cell: ({
      row
    }) => {
      const payment = row.original.Payment;
      if (!payment) return null;
      return <div className="d-flex align-items-center gap-1">
            <img src={payment.image} alt="" width={24} height={24} />
            <span>{payment.lastDigit || payment.name}</span>
          </div>;
    }
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      return <span className={`badge ${row.original.status === 'success' ? 'bg-success-subtle text-success' : row.original.status === 'pending' ? 'bg-warning-subtle text-warning' : row.original.status === 'failed' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'} p-1`}>
            {toPascalCase(row.original.status)}
          </span>;
    }
  }), {
    header: '•••',
    enableSorting: false,
    cell: () => <Link to="#" className="text-muted fs-20">
          <Icon icon="eye" />
        </Link>
  }];
  const table = useReactTable({
    data,
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
        <CardTitle as="h4">Recent Transactions</CardTitle>
        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">All Status</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Processing">Processing</option>
              <option value="Onhold">On Hold</option>
            </FormSelect>
            <Icon icon="filter-2" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search transactions..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <div>
            <select className="form-select form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </select>
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No transactions found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="transactions" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default RecentTransaction;