import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from 'react-bootstrap';
import { saleExecutiveData } from './data';
const columnHelper = createColumnHelper();
const TopPerforming = () => {
  const [data] = useState(() => [...saleExecutiveData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const columns = [columnHelper.accessor('user', {
    header: 'User',
    cell: ({
      row
    }) => <>
          <h5 className="fs-14 mb-0 fw-normal">{row.original.user.name}</h5>
          <span className="text-muted fs-12">{row.original.user.designation}</span>
        </>
  }), columnHelper.accessor('leads', {
    header: 'Leads'
  }), columnHelper.accessor('deals', {
    header: 'Deals'
  }), columnHelper.accessor('tasks', {
    header: 'Tasks'
  }), {
    header: '•••',
    enableSorting: false,
    cell: () => <Link to="" className="text-muted fs-20">
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
        <CardTitle as="h4">Top Performing</CardTitle>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No executives found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="executives" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default TopPerforming;