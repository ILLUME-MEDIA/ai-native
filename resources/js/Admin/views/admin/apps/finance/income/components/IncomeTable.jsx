import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { incomeData } from './data';
const columnHelper = createColumnHelper();
const IncomeTable = () => {
  const [data, setData] = useState(() => [...incomeData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExpenseModal, toggleExpenseModal] = useToggle(false);
  const toggleDeleteModal = () => setShowDeleteModal(!showDeleteModal);
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
  const columns = [{
    id: 'select',
    size: 45,
    header: ({
      table
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14 mt-0" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
    cell: ({
      row
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14 mt-0" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
  }, columnHelper.accessor('id', {
    header: 'ID',
    cell: info => <a href="#!" className="fw-semibold link-reset">
          {info.getValue()}
        </a>
  }), columnHelper.accessor('title', {
    header: 'Income Title'
  }), columnHelper.accessor('category', {
    header: 'Source'
  }), columnHelper.accessor('paymentMethod', {
    header: 'Payment Type',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <img src={row.original.paymentMethod.image} alt="card" className="me-2" height={26} />
          <span>{row.original.paymentMethod.number}</span>
        </div>
  }), columnHelper.accessor('amount', {
    header: 'Amount ($)',
    cell: ({
      row
    }) => {
      const numericValue = Number(row.original.amount.replace(/[^0-9.-]+/g, ''));
      return `$${numericValue.toFixed(2)}`;
    }
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge badge-label ${row.original.status === 'received' ? 'bg-success-subtle text-success' : row.original.status === 'pending' ? 'bg-warning-subtle text-warning ' : row.original.status === 'refunded' ? 'bg-danger-subtle text-danger' : ''}`}>
          {toPascalCase(row.original.status)}
        </span>
  }), columnHelper.accessor('date', {
    header: 'Date',
    cell: ({
      row
    }) => <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
  }), columnHelper.accessor('receivedBy', {
    header: 'Received By',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <img src={row.original.receivedBy.image} alt={row.original.receivedBy.name} className="avatar-xs rounded-circle" />
          <span>{row.original.receivedBy.name}</span>
        </div>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-icon" title="View">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleExpenseModal()}>
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon" title="Delete" onClick={() => {
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
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableRowSelection: true
  });
  const totalItems = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search expenses..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleExpenseModal}>
            <Icon icon="plus" className="me-1" /> Add Expense
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('category')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('category')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Category</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Equipment">Equipment</option>
              <option value="Utilities">Utilities</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Training & Events">Training & Events</option>
            </FormSelect>
            <Icon icon="category" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Reimbursed">Reimbursed</option>
            </FormSelect>
            <Icon icon="circle-check" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect className="form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No expenses found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="expenses" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="expense" />

      <Modal show={showExpenseModal} onHide={toggleExpenseModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="plus" className="me-1" /> Add Expense
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>
                  Expense Title <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" id="expenseTitle" placeholder="Enter expense title" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Amount ($) <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="number" step="0.01" id="expenseAmount" placeholder="Enter amount" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Category <span className="text-danger">*</span>
                </FormLabel>
                <FormSelect id="expenseCategory" required>
                  <option>Select category</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Training & Events">Training &amp; Events</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>Payment Method</FormLabel>
                <FormSelect>
                  <option>Select payment method</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>Status</FormLabel>
                <FormSelect>
                  <option>Select status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Reimbursed">Reimbursed</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>Date &amp; Time</FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" />
              </Col>

              <Col xs="12">
                <FormLabel>Description</FormLabel>
                <textarea id="expenseDesc" className="form-control" rows={3} placeholder="Optional notes or description" />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleExpenseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="device-floppy" className="me-1" /> Save Expense
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default IncomeTable;