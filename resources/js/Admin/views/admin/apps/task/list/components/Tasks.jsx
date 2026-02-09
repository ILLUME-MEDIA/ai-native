import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import clsx from 'clsx';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, FormSelect } from 'react-bootstrap';
import { taskData } from './data';
const columnHelper = createColumnHelper();
const Tasks = () => {
  const columns = [{
    id: 'select',
    maxSize: 45,
    size: 45,
    header: ({
      table
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
    cell: ({
      row
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
    enableSorting: false,
    enableColumnFilter: false
  }, columnHelper.accessor('title', {
    header: 'Task Title',
    cell: ({
      row
    }) => {
      return <>
            <h5 className="fs-base mb-0">
              <Link to="/apps/task/details" className="link-reset">
                {' '}
                {row.original.title}{' '}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">
              Created: {row.original.createdAtDate} <small className="text-muted">{row.original.createdAtTime}</small>
            </p>
          </>;
    }
  }), columnHelper.accessor('assignee', {
    header: 'Assigned To',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-sm">
            <img src={row.original.assignee.image} alt={row.original.assignee.name} className="img-fluid rounded-circle" />
          </div>
          <div>
            <h6 className="mb-0 fs-base fw-semibold">{row.original.assignee.name}</h6>
            <p className="text-muted fs-xs mb-0">{row.original.assignee.members} members</p>
          </div>
        </div>
  }), columnHelper.accessor('dueDate', {
    header: 'Due Date',
    filterFn: 'equalsString',
    enableColumnFilter: true,
    cell: ({
      row
    }) => <>
          <Icon icon="calendar" className={clsx('text-muted me-1', {
        'text-danger': row.original.status === 'cancelled'
      })}></Icon> {row.original.dueDate}
        </>
  }), columnHelper.accessor('totalTask', {
    header: 'Progress',
    cell: ({
      row
    }) => <>
          <Icon icon="list-details" className="text-muted me-1"></Icon> {row.original.completedTask}/{row.original.totalTask}
        </>,
    enableSorting: false
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={clsx('badge fs-xxs', row.original.status === 'cancelled' ? 'badge-outline-danger' : row.original.status === 'in-progress' ? 'badge-outline-warning' : 'badge-outline-success')}>{toPascalCase(row.original.status)}</span>,
    enableSorting: false
  }), columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({
      row
    }) => <span className={clsx('badge fs-xxs', row.original.priority === 'high' ? 'badge-soft-danger' : row.original.priority === 'medium' ? 'badge-soft-warning' : 'badge-soft-success')}>{toPascalCase(row.original.priority)}</span>,
    enableSorting: false
  }), columnHelper.accessor('comments', {
    header: 'Comments',
    cell: ({
      row
    }) => <>
          <Icon icon="messages" className="text-muted fs-sm me-1" />
          {row.original.comments}
        </>,
    enableSorting: false
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex  gap-1">
          <Button variant="default" size="sm" className="btn-icon">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon">
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon" onClick={() => {
        toggleDeleteModal();
        setSelectedRowIds({
          [row.id]: true
        });
      }}>
            <Icon icon="trash" className="fs-lg" />
          </Button>
        </div>
  }];
  const [data, setData] = useState(() => [...taskData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
      rowSelection: selectedRowIds
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelectedRowIds,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal);
  };
  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds));
    setData(old => old.filter((_, idx) => !selectedIds.has(idx.toString())));
    setSelectedRowIds({});
    setPagination({
      ...pagination,
      pageIndex: 0
    });
    setShowDeleteModal(false);
  };
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input onChange={e => setGlobalFilter(e.target.value)} value={globalFilter ?? ''} type="search" className="form-control" placeholder="Search task..." />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Task Status</option>
              <option value="New">New</option>
              <option value="In-Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="In-Review">In Review</option>
              <option value="Cancelled">Cancelled</option>
            </FormSelect>

            <Icon icon="list-check" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect value={table.getColumn('priority')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('priority')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </FormSelect>

            <Icon icon="alert-triangle" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} className="form-control my-1 my-md-0">
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>

        <div className="d-flex gap-1">
          <Link to="/apps/task/create" className="btn btn-primary ms-1">
            {' '}
            <Icon icon="plus" className="fs-sm me-2" /> Add Task{' '}
          </Link>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No records found" />
      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="taks" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="task" />
    </Card>;
};
export default Tasks;