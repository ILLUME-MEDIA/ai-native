import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, FormControl, FormSelect } from 'react-bootstrap';
import { ticketData } from './data';
const columnHelper = createColumnHelper();
const TicketsTable = () => {
  const [data, setData] = useState(() => [...ticketData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const columns = [{
    id: 'select',
    header: ({
      table
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
    cell: ({
      row
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
    enableSorting: false,
    enableColumnFilter: false
  }, columnHelper.accessor('id', {
    header: 'ID',
    cell: ({
      row
    }) => <Link to="/apps/ticket/details" className="fw-semibold link-reset">
          {row.original.id}
        </Link>
  }), columnHelper.accessor('requestedBy', {
    header: 'Requested By',
    cell: ({
      row
    }) => <div className="d-flex gap-2 align-items-center">
          <img src={row.original.requestedBy.image} height={24} width={24} alt={row.original.requestedBy.name} className="avatar-xs rounded-circle" />
          <span>{row.original.requestedBy.name}</span>
        </div>
  }), columnHelper.accessor('subject', {
    header: 'Ticket Subject'
  }), columnHelper.accessor('agent', {
    header: 'Assigned Agent',
    cell: ({
      row
    }) => <div className="d-flex gap-2 align-items-center">
          <img src={row.original.agent.image} height={24} width={24} alt={row.original.agent.name} className="avatar-xs rounded-circle" />
          <Link to="" className="link-reset">
            {row.original.agent.name}
          </Link>
        </div>
  }), columnHelper.accessor('priority', {
    header: 'Priority',
    cell: ({
      row
    }) => {
      const color = row.original.priority === 'high' ? 'text-bg-danger' : row.original.priority === 'medium' ? 'text-bg-warning' : 'text-bg-primary';
      return <span className={`badge ${color}`}>{toPascalCase(row.original.priority)}</span>;
    }
  }), columnHelper.accessor('status', {
    header: 'Status',
    filterFn: 'equalsString',
    enableColumnFilter: true,
    cell: ({
      row
    }) => {
      const badgeClass = row.original.status === 'pending' ? 'bg-warning-subtle text-warning' : row.original.status === 'in-progress' ? 'bg-info-subtle text-info' : row.original.status === 'resolved' ? 'bg-success-subtle text-success' : row.original.status === 'escalated' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary';
      return <span className={`badge ${badgeClass} badge-label`}>{toPascalCase(row.original.status)}</span>;
    }
  }), columnHelper.accessor('createdAtDate', {
    header: 'Date Created',
    cell: ({
      row
    }) => <>
          {row.original.createdAtDate} <small className="text-muted">{row.original.createdAtTime}</small>
        </>
  }), columnHelper.accessor('dueDate', {
    header: 'Due Date'
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex gap-1">
          <Button size="sm" variant="default" className="btn-icon btn-sm">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" variant="default" className="btn-icon btn-sm">
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button size="sm" variant="default" className="btn-icon btn-sm" onClick={() => {
        toggleDeleteModal();
        setSelectedRowIds({
          [row.id]: true
        });
      }}>
            <Icon icon="trash" className="fs-lg" />
          </Button>
        </div>
  }];
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
            <FormControl type="text" placeholder="Search tickets..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
              Delete
            </Button>}

          <Link to="/apps/ticket/create" className="btn btn-primary">
            <Icon icon="plus" className="me-1" /> New Ticket
          </Link>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? ''} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)}>
              <option value="">Status</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Escalated">Escalated</option>
              <option value="In Progress">In Progress</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('priority')?.getFilterValue() ?? ''} onChange={e => table.getColumn('priority')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)}>
              <option value="">Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </FormSelect>
            <Icon icon="alert-triangle" className="app-search-icon text-muted" />
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

      <DataTable table={table} emptyMessage="No records found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="tickets" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="ticket" />
    </Card>;
};
export default TicketsTable;