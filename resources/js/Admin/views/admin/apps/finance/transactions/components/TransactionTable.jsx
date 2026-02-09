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
import { transactionData } from './data';
const columnHelper = createColumnHelper();
const TransactionTable = () => {
  const [data, setData] = useState(() => [...transactionData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransactionModal, toggleTransactionModal] = useToggle(false);
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
  }), columnHelper.accessor('description', {
    header: 'Description'
  }), columnHelper.accessor('type', {
    header: 'Type',
    cell: ({
      row
    }) => <span className={`badge ${row.original.type === 'credit' ? 'bg-success-subtle text-success' : row.original.type === 'debit' ? 'bg-danger-subtle text-danger' : row.original.type === 'refund' ? 'bg-info-subtle text-info' : row.original.type === 'adjustment' ? 'bg-secondary-subtle text-secondary' : 'bg-secondary-subtle text-secondary'}`}>
          {toPascalCase(row.original.type)}
        </span>
  }), columnHelper.accessor('paymentMethod', {
    header: 'Payment',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <img src={row.original.paymentMethod.image} alt="card" className="me-2" height={26} />
          <span>{row.original.paymentMethod.number}</span>
        </div>
  }), columnHelper.accessor('amount', {
    header: 'Amount',
    cell: ({
      row
    }) => <span className={`${row.original.amount.includes('+') ? 'text-success' : 'text-danger'}`}>{row.original.amount}</span>
  }), columnHelper.accessor('balance', {
    header: 'Balance'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge badge-label ${row.original.status === 'completed' ? 'bg-success-subtle text-success' : row.original.status === 'pending' ? 'bg-warning-subtle text-warning ' : row.original.status === 'adjustment' ? 'bg-info-subtle text-info' : row.original.status === 'failed' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`}>
          {toPascalCase(row.original.status)}
        </span>
  }), columnHelper.accessor('date', {
    header: 'Date',
    cell: ({
      row
    }) => <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
  }), columnHelper.accessor('processedBy', {
    header: 'Processed By',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <img src={row.original.processedBy.image} alt={row.original.processedBy.name} className="avatar-xs rounded-circle" />
          <span>{row.original.processedBy.name}</span>
        </div>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-icon" title="View">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleTransactionModal()}>
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
            <input type="search" className="form-control" placeholder="Search transactions..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleTransactionModal}>
            <Icon icon="plus" className="me-1" /> Add Transaction
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('type')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('type')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Type</option>
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
              <option value="Refund">Refund</option>
              <option value="Adjustment">Adjustment</option>
            </FormSelect>
            <Icon icon="transaction-dollar" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
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

      <DataTable table={table} emptyMessage="No transactions found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="transactions" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="transaction" />

      <Modal show={showTransactionModal} onHide={toggleTransactionModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="plus" className="me-1" /> Add Transaction
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>Transaction Type</FormLabel>
                <FormSelect required>
                  <option>Select Type</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                  <option value="Refund">Refund</option>
                  <option value="Adjustment">Adjustment</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>Payment Method</FormLabel>
                <FormSelect required>
                  <option>Select Method</option>
                  <option value="Visa">Visa</option>
                  <option value="MasterCard">MasterCard</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Amex">American Express</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </FormSelect>
              </Col>

              <Col xs="12">
                <FormLabel>Description</FormLabel>
                <FormControl type="text" placeholder="Enter transaction description" required />
              </Col>

              <Col md="6">
                <FormLabel>Amount ($)</FormLabel>
                <FormControl type="number" placeholder="0.00" step="0.01" required />
              </Col>

              <Col md="6">
                <FormLabel>Status</FormLabel>
                <FormSelect required>
                  <option>Select Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>Date</FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" />
              </Col>

              <Col md="6">
                <FormLabel>Processed By</FormLabel>
                <FormControl type="text" placeholder="Enter staff name" required />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleTransactionModal}>
              <Icon icon="x" className="me-1" />
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="device-floppy" className="me-1" /> Save Transaction
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default TransactionTable;