import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, CardTitle } from 'react-bootstrap';
import { orderData } from './data';
import Icon from '@admin/components/wrappers/Icon';
const columnHelper = createColumnHelper();
const RecentOrder = () => {
  const [data] = useState(orderData);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const columns = [columnHelper.accessor('id', {
    header: '#ID'
  }), columnHelper.accessor('customer', {
    header: 'Customer',
    cell: ({
      row
    }) => <>
          <h5 className="m-0 fs-base">{row.original.customer.name}</h5>
          <span className="text-muted fs-xs">{row.original.customer.email}</span>
        </>
  }), columnHelper.accessor('date', {
    header: 'Date'
  }), columnHelper.accessor('amount', {
    header: 'Amount'
  }), columnHelper.accessor('payment', {
    header: 'Payment'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      const statusMap = {
        completed: 'success',
        pending: 'warning',
        cancelled: 'danger',
        failed: 'danger'
      };
      const labelMap = {
        completed: 'Completed',
        pending: 'Pending',
        cancelled: 'Cancelled',
        failed: 'Failed'
      };
      const status = row.original.status;
      return <span className={`badge bg-${statusMap[status]}-subtle text-${statusMap[status]}`}>{labelMap[status]}</span>;
    }
  })];
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card className="card-h-100">
      <CardHeader className="justify-content-between">
        <CardTitle as="h4">
          Recent Orders <span className="text-muted fs-base fw-normal">(186.25k Transactions)</span>
        </CardTitle>
        <div>
          <Button size="sm" className="btn-default me-1">
            <Icon icon="cloud-upload" className="me-1" /> 
            Export
          </Button>
          <Button size="sm" variant="light">
            <Icon icon="download" className="me-1" /> 
            Import
          </Button>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No orders found" className="table-centered table-hover" />

      <CardFooter className="border-0">
        <TablePagination totalItems={totalItems} start={start} end={end} itemsName="orders" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
      </CardFooter>
    </Card>;
};
export default RecentOrder;