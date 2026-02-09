import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { customerData } from './data';
const columnHelper = createColumnHelper();
const CustomersCard = () => {
  const [showModal, setShowModal] = useState(false);
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
  }, columnHelper.accessor('user.name', {
    header: 'Customer Name',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-sm">
            <img src={row.original.user.image} alt="" height={32} width={32} className="img-fluid rounded-circle" />
          </div>
          <div>
            <h5 className="mb-0 lh-base fs-base">
              <Link to="/users/profile" className="link-reset">
                {row.original.user.name}
              </Link>
            </h5>
            <p className="text-muted fs-xs mb-0">{row.original.user.email}</p>
          </div>
        </div>
  }), columnHelper.accessor('user.phone', {
    header: 'Phone'
  }), columnHelper.accessor('country', {
    header: 'Country',
    cell: ({
      row
    }) => <>
          <span className="badge p-1 text-bg-light fs-sm">
            <img src={row.original.country.flag} alt="" className="rounded-circle me-1" height={12} width={12} /> {row.original.country.code}
          </span>
        </>
  }), columnHelper.accessor('joinedDate', {
    header: 'Date',
    cell: ({
      row
    }) => <>{row.original.joinedDate}</>
  }), columnHelper.accessor('type', {
    header: 'Type'
  }), columnHelper.accessor('company', {
    header: 'Company'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      const color = row.original.status === 'blocked' ? ' bg-danger-subtle text-danger' : row.original.status === 'verification-pending' ? 'bg-warning-subtle text-warning' : row.original.status === 'active' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary';
      return <span className={`badge badge-label ${color}`}>{toPascalCase(row.original.status)}</span>;
    }
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
  const [data, setData] = useState(() => [...customerData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
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
      pagination,
      rowSelection: selectedRowIds
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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
            <input type="text" className="form-control" placeholder="Search Customer..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Icon icon="plus" className="fs-lg" /> New Customer
          </Button>

          <CustomerModal show={showModal} onHide={() => setShowModal(false)} />

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('country')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('country')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Country</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="BR">Brazil</option>
              <option value="DE">Germany</option>
              <option value="JP">Japan</option>
              <option value="FR">France</option>
              <option value="IN">India</option>
              <option value="EG">Egypt</option>
              <option value="CA">Canada</option>
            </FormSelect>
            <Icon icon="world" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Account Status</option>
              <option value="Active">Active</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Inactive">Inactive</option>
              <option value="Blocked">Blocked</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
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
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="customers" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="customers" />
    </Card>;
};
export default CustomersCard;
const CustomerModal = ({
  show,
  onHide
}) => {
  return <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Add New Customer</ModalTitle>
      </ModalHeader>

      <Form id="addCustomerForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="customerName">
                <FormLabel>Customer Name</FormLabel>
                <FormControl type="text" placeholder="Enter full name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="email">
                <FormLabel>Email Address</FormLabel>
                <FormControl type="email" placeholder="Enter email" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="phone">
                <FormLabel>Phone Number</FormLabel>
                <FormControl type="text" placeholder="e.g. +1 234 567 8900" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="company">
                <FormLabel>Company</FormLabel>
                <FormControl type="text" placeholder="Company name" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="country">
                <FormLabel>Country</FormLabel>
                <FormSelect required>
                  <option value="">Select country</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>India</option>
                  <option>Canada</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Japan</option>
                  <option>Brazil</option>
                  <option>Egypt</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="customerType">
                <FormLabel>Customer Type</FormLabel>
                <FormSelect required>
                  <option value="">Select type</option>
                  <option>Lead</option>
                  <option>Prospect</option>
                  <option>Client</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="accountStatus">
                <FormLabel>Account Status</FormLabel>
                <FormSelect required>
                  <option>Select status</option>
                  <option>Active</option>
                  <option>Verification Pending</option>
                  <option>Inactive</option>
                  <option>Blocked</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="joinedDate">
                <FormLabel>Joined Date</FormLabel>
                <Flatpickr className="form-control" required options={{
                dateFormat: 'd M Y'
              }} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Customer
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};