import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { staffListData } from './data';

// Table setup
const columnHelper = createColumnHelper();
const StaffTable = () => {
  const [data, setData] = useState(() => [...staffListData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStaffModal, toggleStaffModal] = useToggle(false);
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
    header: 'Staff ID',
    cell: ({
      row
    }) => <Link to="" className="fw-semibold link-reset">
          {row.original.id}
        </Link>
  }), columnHelper.accessor('member.name', {
    header: 'Staff Name',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-sm">
            <img src={row.original.member.image} alt={row.original.member.name} className="img-fluid rounded-circle" />
          </div>
          <div>
            <h5 className="mb-0 lh-base fs-base">{row.original.member.name}</h5>
            <p className="text-muted fs-xs mb-0">{row.original.member.email}</p>
          </div>
        </div>
  }), columnHelper.accessor('phone', {
    header: 'Phone'
  }), columnHelper.accessor('country.code', {
    header: 'Country',
    cell: ({
      row
    }) => <span className="badge p-1 text-bg-light fs-sm">
          <img src={row.original.country.flag} height={12} alt={row.original.country.code} className="me-1 rounded-circle" />
          {row.original.country.code}
        </span>
  }), columnHelper.accessor('joinedDate', {
    header: 'Joined'
  }), columnHelper.accessor('role', {
    header: 'Role'
  }), columnHelper.accessor('department', {
    header: 'Department'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge badge-label ${row.original.status === 'active' ? 'bg-success-subtle text-success' : row.original.status === 'on-leave' ? 'bg-warning-subtle text-warning' : row.original.status === 'suspended' ? 'bg-danger-subtle text-danger' : row.original.status === 'probation' ? 'bg-warning-subtle text-warning' : row.original.status === 'review-pending' ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}`}>
          {toPascalCase(row.original.status)}
        </span>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex align-items-center justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-icon rounded">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon rounded">
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon rounded" onClick={() => {
        toggleDeleteModal();
        setSelectedRowIds({
          [row.id]: true
        });
      }}>
            <Icon icon="trash" className="fs-lg" />
          </Button>
        </div>
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
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search staff..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          <Button variant="primary" onClick={toggleStaffModal}>
            <Icon icon="plus" className="me-1" /> New Staff
          </Button>
          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        {/* Filters */}
        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>
          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('department')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('department')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Department</option>
              <option value="Human Resources">Human Resources</option>
              <option value="IT Department">IT Department</option>
              <option value="Operations">Operations</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">Finance</option>
              <option value="Design">Design</option>
              <option value="Analytics">Analytics</option>
              <option value="Product">Product</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </FormSelect>
            <Icon icon="layout" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Employment Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
              <option value="Suspended">Suspended</option>
              <option value="Review Pending">Review Pending</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
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

      <DataTable table={table} emptyMessage="No staff found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="staff" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="staff" />

      {/* Add Staff Modal */}
      <Modal show={showStaffModal} onHide={toggleStaffModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="user-plus" className="me-1"></Icon>
            Add New Staff
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>Full Name</FormLabel>
                <FormControl type="text" id="staffName" placeholder="Enter full name" required />
              </Col>
              <Col md="6">
                <FormLabel>Email</FormLabel>
                <FormControl type="email" id="staffEmail" placeholder="name@example.com" required />
              </Col>
              <Col md="6">
                <FormLabel>Phone</FormLabel>
                <FormControl type="text" id="staffPhone" placeholder="+1 202 555 0123" />
              </Col>
              <Col md="6">
                <FormLabel>Country</FormLabel>
                <FormSelect>
                  <option>Select country</option>
                  <option value="USA">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                </FormSelect>
              </Col>
              <Col md="6">
                <FormLabel>Role</FormLabel>
                <FormControl type="text" id="staffRole" placeholder="e.g. Software Engineer" />
              </Col>
              <Col md="6">
                <FormLabel>Department</FormLabel>
                <FormSelect>
                  <option>Select department</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="IT Department">IT Department</option>
                  <option value="Operations">Operations</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Design">Design</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Product">Product</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                </FormSelect>
              </Col>
              <Col md="6">
                <FormLabel>Status</FormLabel>
                <FormSelect>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Probation">Probation</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Review Pending">Review Pending</option>
                </FormSelect>
              </Col>
              <Col md="6">
                <FormLabel>Join Date</FormLabel>
                <Flatpickr className="form-control" required />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleStaffModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="check" className="me-1"></Icon>
              Save Staff
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default StaffTable;