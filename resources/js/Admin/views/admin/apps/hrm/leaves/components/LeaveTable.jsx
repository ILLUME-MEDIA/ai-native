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
import { leaveData } from './data';

// Table setup
const columnHelper = createColumnHelper();
const LeaveTable = () => {
  const [data, setData] = useState(() => [...leaveData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, toggleLeaveModal] = useToggle(false);
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
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14 mt-0" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
    enableSorting: false,
    enableColumnFilter: false
  }, columnHelper.accessor('id', {
    header: 'Employee ID',
    cell: ({
      row
    }) => <span className="fw-semibold">{row.original.id}</span>
  }), columnHelper.accessor('name', {
    header: 'Employee',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-sm rounded-circle bg-light d-flex align-items-center justify-content-center me-2">
            <Icon icon="user" className="fs-lg text-muted" />
          </div>
          {row.original.name}
        </div>
  }), columnHelper.accessor('department', {
    header: 'Department'
  }), columnHelper.accessor('dataFrom', {
    header: 'Date From'
  }), columnHelper.accessor('dataTo', {
    header: 'Date To'
  }), columnHelper.accessor('leaveType', {
    header: 'Leave Type'
  }), columnHelper.accessor('reason', {
    header: 'Reason'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'Pending' ? 'bg-warning-subtle text-warning' : row.original.status === 'Approved' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>{toPascalCase(row.original.status)}</span>
  }), columnHelper.accessor('appliedOn', {
    header: 'Applied On'
  }), columnHelper.accessor('approvedBy', {
    header: 'Approved By'
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => {
      const {
        status
      } = row.original;
      if (status === 'Pending') {
        return <div className="d-flex align-items-center justify-content-end gap-1">
              <Button variant="success" size="sm" className="btn-icon rounded-circle" title="Approve">
                <Icon icon="check" className="fs-lg" />
              </Button>

              <Button variant="danger" size="sm" className="btn-icon rounded-circle" title="Reject">
                <Icon icon="x" className="fs-lg" />
              </Button>

              <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleLeaveModal()}>
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
            </div>;
      }
      return <div className="d-flex align-items-center justify-content-end gap-1">
            <Button size="sm" className="btn-default btn-icon" title="View">
              <Icon icon="eye" className="fs-lg" />
            </Button>

            <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleLeaveModal()}>
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
          </div>;
    }
  }];

  // Table logic
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
            <input type="search" className="form-control" placeholder="Search leave records..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleLeaveModal}>
            <Icon icon="plus" className="me-1" /> Add Leave
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold me-2">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('leaveType')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('leaveType')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Leave Type</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Paid Leave">Paid Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </FormSelect>
            <Icon icon="file-text" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </FormSelect>
            <Icon icon="box" className="app-search-icon text-muted" />
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

      <DataTable table={table} emptyMessage="No leave records found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="leave records" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="leave record" />

      <Modal show={showLeaveModal} onHide={toggleLeaveModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="calendar-plus" className="me-1" /> Add Leave
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="4">
                <FormLabel>Employee ID</FormLabel>
                <input type="text" id="employeeId" className="form-control" placeholder="e.g., EMP-1056" required />
              </Col>

              <Col md="4">
                <FormLabel>Employee Name</FormLabel>
                <input type="text" id="employeeName" className="form-control" placeholder="Enter name" required />
              </Col>

              <Col md="4">
                <FormLabel>Department</FormLabel>
                <FormSelect required>
                  <option>Select Department</option>
                  <option>HR</option>
                  <option>Finance</option>
                  <option>IT</option>
                  <option>Design</option>
                  <option>Marketing</option>
                  <option>Support</option>
                  <option>Operations</option>
                </FormSelect>
              </Col>

              <Col md="4">
                <FormLabel>Date From</FormLabel>
                <Flatpickr type="date" className="form-control" data-date-format="d M, Y" id="dateFrom" required />
              </Col>

              <Col md="4">
                <FormLabel>Date To</FormLabel>
                <Flatpickr type="date" className="form-control" data-date-format="d M, Y" id="dateTo" required />
              </Col>

              <Col md="4">
                <FormLabel>Leave Type</FormLabel>
                <FormSelect id="leaveType" required>
                  <option>Select Leave Type</option>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Paid Leave</option>
                  <option>Maternity Leave</option>
                  <option>Unpaid Leave</option>
                </FormSelect>
              </Col>

              <Col md="12">
                <FormLabel>Reason</FormLabel>
                <textarea id="reason" className="form-control" rows={3} placeholder="Enter reason" required />
              </Col>

              <Col md="4">
                <FormLabel>Status</FormLabel>
                <FormSelect id="leave-status" required>
                  <option>Select Status</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </FormSelect>
              </Col>

              <Col md="4">
                <FormLabel>Approved By</FormLabel>
                <FormControl type="text" placeholder="Approver name" />
              </Col>

              <Col md="4">
                <FormLabel>Applied On</FormLabel>
                <Flatpickr className="form-control" data-date-format="d M, Y" />
              </Col>

              <Col md="12">
                <FormLabel>Remarks</FormLabel>
                <textarea id="remarks" className="form-control" rows={3} placeholder="Optional remarks..." />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleLeaveModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="check" className="me-1" /> Save Leave
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default LeaveTable;