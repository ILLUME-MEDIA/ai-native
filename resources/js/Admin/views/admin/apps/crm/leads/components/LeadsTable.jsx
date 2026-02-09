import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { leadData } from './data';
const columnHelper = createColumnHelper();
const priceRangeFilterFn = (row, columnId, value) => {
  const amount = row.getValue(columnId);
  if (!value) return true;
  if (value === '500000+') return amount > 500000;
  const [min, max] = value.split('-').map(Number);
  return amount >= min && amount <= max;
};
const LeadsTable = () => {
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
  }, columnHelper.accessor('id', {
    header: 'Lead Id'
  }), columnHelper.accessor('customer', {
    header: 'Customer'
  }), columnHelper.accessor('company', {
    header: 'Company',
    enableSorting: false,
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded-circle me-2 justify-content-center d-flex align-items-center">
            <img src={row.original.image} alt="Product" height="20" />
          </div>
          <Link to="" className="link-reset">
            {row.original.company}
          </Link>
        </div>
  }), columnHelper.accessor('email', {
    header: 'Email'
  }), columnHelper.accessor('phone', {
    header: 'Phone'
  }), columnHelper.accessor('amount', {
    header: 'amount (usd)',
    enableColumnFilter: true,
    filterFn: priceRangeFilterFn,
    cell: ({
      row
    }) => <>{row.original.amount}</>
  }), columnHelper.accessor('tag', {
    header: 'Tags',
    cell: ({
      row
    }) => <span className={`badge badge-label ${row.original.tag.className}`}>{row.original.tag.label}</span>
  }), columnHelper.accessor('assigned', {
    header: 'Assigned',
    cell: ({
      row
    }) => <OverlayTrigger overlay={<Tooltip>{row.original.assigned.name}</Tooltip>}>
          <img src={row.original.assigned.image} alt="Product" className="avatar-xs rounded-circle" />
        </OverlayTrigger>
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'in-progress' ? 'bg-success-subtle text-success' : row.original.status === 'proposal-sent' ? 'bg-primary-subtle text-primary' : row.original.status === 'follow-up' ? 'bg-info-subtle text-info' : row.original.status === 'pending' ? 'bg-warning-subtle text-warning' : row.original.status === 'rejected' ? 'bg-danger-subtle text-danger' : row.original.status === 'negotiation' ? 'bg-secondary-subtle text-secondary' : 'bg-secondary-subtle text-secondary'}`}>
          {toPascalCase(row.original.status)}
        </span>
  }), columnHelper.accessor('createdDate', {
    header: 'Created'
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
  const [data, setData] = useState(() => [...leadData]);
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
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
    filterFns: {
      priceRange: priceRangeFilterFn
    }
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDealModal, toggleDealModal] = useToggle(false);
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
            <input type="search" className="form-control" placeholder="Search deals..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          <Button variant="primary" onClick={toggleDealModal}>
            <Icon icon="plus" className="me-1" /> New Lead
          </Button>
          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Pending">Pending</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Rejected">Rejected</option>
            </FormSelect>

            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect value={table.getColumn('amount')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('amount')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)} className="form-control my-1 my-md-0">
              <option value="All">Amount Range</option>
              <option value="0-100000">$0 - $100000</option>
              <option value="100001-250000">$100001 - $250000</option>
              <option value="250001-500000">$250001 - $500000</option>
              <option value="500000+">$500000+</option>
            </FormSelect>
            <Icon icon="currency-dollar" className="app-search-icon text-muted" />
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

      <CardBody className="p-0">
        <DataTable table={table} emptyMessage="No records found" />
      </CardBody>

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="leads" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="lead" />

      <Modal show={showDealModal} onHide={toggleDealModal} size="lg">
        <ModalHeader closeButton>
          <ModalTitle as="h5">Add New Lead</ModalTitle>
        </ModalHeader>

        <Form id="leadForm">
          <ModalBody>
            <Row className="g-3">
              <Col md={6}>
                <FormGroup controlId="leadName">
                  <FormLabel>Lead Name</FormLabel>
                  <FormControl type="text" placeholder="Enter lead name" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="companyName">
                  <FormLabel>Company</FormLabel>
                  <FormControl type="text" placeholder="Enter company name" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="email">
                  <FormLabel>Email</FormLabel>
                  <FormControl type="email" placeholder="Enter email" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="phone">
                  <FormLabel>Phone</FormLabel>
                  <FormControl type="tel" placeholder="+1 234-567-8910" />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="amount">
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl type="number" placeholder="e.g. 50000" />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="leadStatus">
                  <FormLabel>Status</FormLabel>
                  <FormSelect>
                    <option value="">Select status</option>
                    <option>In Progress</option>
                    <option>Proposal Sent</option>
                    <option>Follow Up</option>
                    <option>Pending</option>
                    <option>Negotiation</option>
                    <option>Rejected</option>
                  </FormSelect>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="assignedTo">
                  <FormLabel>Assign To</FormLabel>
                  <FormSelect>
                    <option value="">Select user</option>
                    <option value="1">Emily Carter</option>
                    <option value="2">Rohan Iyer</option>
                    <option value="3">Sara Kim</option>
                    <option value="4">Kevin Nguyen</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onClick={toggleDealModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Lead
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default LeadsTable;