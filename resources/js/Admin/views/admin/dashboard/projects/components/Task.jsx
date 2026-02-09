import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { taskData } from './data';
const columnHelper = createColumnHelper();
const Task = () => {
  const [data] = useState(taskData);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const columns = [columnHelper.accessor('title', {
    header: 'Task',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">{row.original.dueInfo}</span>
          <h5 className="fs-base mb-0">
            <a href="#" className="text-body">
              {row.original.title}
            </a>
          </h5>
        </>
  }), columnHelper.accessor('dueDate', {
    header: 'Due Date',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">Due Date</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.dueDate}</h5>
        </>
  }), columnHelper.accessor('assignedTo', {
    header: 'Assigned To',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <img src={row.original.assignedTo.image} className="avatar-sm rounded-circle me-2" alt={row.original.assignedTo.name} />
          <div>
            <span className="text-muted fs-12">Assigned To</span>
            <h5 className="fs-base mb-0 fw-normal">{row.original.assignedTo.name}</h5>
          </div>
        </div>
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      return <>
            <span className="text-muted fs-12">Status</span>
            <h5 className="fs-base mb-0 fw-normal">
              <span className={`badge ${row.original.status === 'completed' ? 'badge-soft-success' : row.original.status === 'in-progress' ? 'badge-soft-info' : row.original.status === 'pending' ? 'badge-soft-warning' : row.original.status === 'blocked' ? 'badge-soft-danger' : row.original.status === 'reviewing' ? 'badge-soft-primary' : ''}`}>
                {toPascalCase(row.original.status)}
              </span>
            </h5>
          </>;
    }
  }), columnHelper.accessor('time', {
    header: 'Time Spent',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">Total time spent</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.time}</h5>
        </>
  }), {
    id: 'actions',
    header: '',
    cell: () => <Dropdown>
          <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
            <Icon icon="dots-vertical" className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align="end">
            <DropdownItem>View Task</DropdownItem>
            <DropdownItem>Edit Task</DropdownItem>
            <DropdownItem>Mark as Completed</DropdownItem>
          </DropdownMenu>
        </Dropdown>,
    enableSorting: false
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
        <CardTitle as="h4">Tasks</CardTitle>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search">
            <input type="text" className="form-control" placeholder="Search task..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          <div>
            <select className="form-select form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 10, 15, 20, 50].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </select>
          </div>
        </div>
      </CardHeader>

      <div className="bg-light bg-opacity-25 p-2 text-center border-bottom border-dashed">
        <p className="m-0">
          <b>107</b> Tasks completed out of <span className="fw-medium">195</span>
        </p>
      </div>

      <DataTable table={table} emptyMessage="No tasks found" className="table-custom table-centered table-hover" showHeaders={false} />

      {totalItems > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="tasks" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default Task;