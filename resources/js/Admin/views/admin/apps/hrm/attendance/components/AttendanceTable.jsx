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
import { attendanceData } from './data';

// Column helper
const columnHelper = createColumnHelper();
const AttendanceTable = () => {
  const [data, setData] = useState(() => [...attendanceData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showModal, toggleModal] = useToggle(false);
  const toggleDeleteModal = () => setShowDeleteModal(!showDeleteModal);

  // Table columns
  const columns = [columnHelper.accessor('date', {
    header: 'Date'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'present' ? 'bg-success-subtle text-success' : row.original.status === 'late' ? 'bg-warning-subtle text-warning' : row.original.status === 'half-day' ? 'bg-warning-subtle text-warning' : row.original.status === 'on-leave' ? 'bg-info-subtle text-info' : 'bg-danger-subtle text-danger'}`}>
          {toPascalCase(row.original.status)}
        </span>
  }), columnHelper.accessor('shiftType', {
    header: 'Shift Type'
  }), columnHelper.accessor('clockIn', {
    header: 'Clock In'
  }), columnHelper.accessor('clockOut', {
    header: 'Clock Out'
  }), columnHelper.accessor('production', {
    header: 'Production'
  }), columnHelper.accessor('breakTime', {
    header: 'Break'
  }), columnHelper.accessor('overtime', {
    header: 'Overtime'
  }), columnHelper.accessor('progress', {
    header: 'Progress',
    cell: ({
      row
    }) => <div className="progress progress-sm">
          <div className={`progress-bar ${row.original.status === 'late' || row.original.status === 'half-day' ? 'bg-warning' : row.original.status === 'absent' ? 'bg-light' : 'bg-success'}`} style={{
        width: `${row.original.progress}%`
      }} />
        </div>
  }), columnHelper.accessor('totalHours', {
    header: 'Total Hours'
  }), columnHelper.accessor('leaveType', {
    header: 'Leave Type'
  }), columnHelper.accessor('approval', {
    header: 'Approval',
    cell: ({
      row
    }) => <span className={`badge ${row.original.approval === 'approved' ? 'bg-success-subtle text-success' : row.original.approval === 'pending' ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger'}`}>{toPascalCase(row.original.approval)}</span>
  }), columnHelper.accessor('user.name', {
    header: 'Approval By'
  })];

  // React Table setup
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
            <input type="search" className="form-control" placeholder="Search attendance..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleModal}>
            <Icon icon="plus" className="me-1" /> Add Record
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
              <option value="Absent">Absent</option>
            </FormSelect>
            <Icon icon="user-check" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('shiftType')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('shiftType')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Shift Type</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="Mid Shift">Mid Shift</option>
            </FormSelect>
            <Icon icon="clock" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect className="form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20, 50].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No attendance records found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="records" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="attendance records" />

      <Modal show={showModal} onHide={toggleModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="calendar-plus" className="me-1"></Icon>
            Add Attendance Record
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="4">
                <FormLabel>Date</FormLabel>
                <Flatpickr className="form-control" required />
              </Col>
              <Col md="4">
                <FormLabel>Shift Type</FormLabel>
                <FormSelect id="shift-type" required>
                  <option>Select Shift</option>
                  <option>Day Shift</option>
                  <option>Night Shift</option>
                  <option>Mid Shift</option>
                </FormSelect>
              </Col>

              <Col md="4">
                <FormLabel>Status</FormLabel>
                <FormSelect required>
                  <option>Select Status</option>
                  <option>Present</option>
                  <option>Late</option>
                  <option>Half Day</option>
                  <option>On Leave</option>
                  <option>Absent</option>
                </FormSelect>
              </Col>

              <Col md="4">
                <FormLabel>Clock In</FormLabel>
                <FormControl type="text" placeholder="09:00 AM" />
              </Col>
              <Col md="4">
                <FormLabel>Clock Out</FormLabel>
                <FormControl type="text" placeholder="06:00 PM" />
              </Col>

              <Col md="4">
                <FormLabel>Leave Type</FormLabel>
                <FormSelect>
                  <option>None</option>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Paid Leave</option>
                </FormSelect>
              </Col>

              <Col md="4">
                <FormLabel>Approval Status</FormLabel>
                <FormSelect>
                  <option>Approved</option>
                  <option>Pending</option>
                  <option>Rejected</option>
                </FormSelect>
              </Col>
              <Col md="4">
                <FormLabel>Approved By</FormLabel>
                <FormControl type="text" id="approval-by" placeholder="e.g. Maria Smith" />
              </Col>
              <Col md="12">
                <FormLabel>Remarks</FormLabel>
                <textarea id="remarks" className="form-control" rows={3} placeholder="Optional remarks" />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="check" className="me-1" />
              Save Record
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default AttendanceTable;