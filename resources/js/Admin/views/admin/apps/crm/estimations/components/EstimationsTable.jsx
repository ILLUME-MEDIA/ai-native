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
import { useToggle } from 'usehooks-ts';
import { estimateData } from './data';
const columnHelper = createColumnHelper();
const EstimationsTable = () => {
  const [showModal, toggleModal] = useToggle(false);
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
    header: 'Estimate ID',
    cell: ({
      row
    }) => <Link to="" className="fw-semibold link-reset">
          {row.original.id}
        </Link>
  }), columnHelper.accessor('project', {
    header: 'Project'
  }), columnHelper.accessor('client', {
    header: 'Client',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded-circle me-2 justify-content-center d-flex align-items-center">
            <img src={row.original.client.image} alt={row.original.client.name} height={20} />
          </div>
          <span className="link-reset">{row.original.client.name}</span>
        </div>
  }), columnHelper.accessor('value', {
    header: 'Estimated Value'
  }), columnHelper.accessor('estimatedBy', {
    header: 'Estimated By',
    cell: ({
      row
    }) => <div className="d-flex gap-2 align-items-center">
          <img src={row.original.estimatedBy.image} alt={row.original.estimatedBy.name} height={20} className="avatar-xs rounded-circle" />
          <span className="link-reset">{row.original.estimatedBy.name}</span>
        </div>
  }), columnHelper.accessor('createdDate', {
    header: 'Created',
    cell: ({
      row
    }) => <>
          {row.original.createdDate} <small className="text-muted">{row.original.createdTime}</small>
        </>
  }), columnHelper.accessor('closeDate', {
    header: 'Expected Close',
    cell: ({
      row
    }) => <>
          {row.original.closeDate} <small className="text-muted">{row.original.closeTime}</small>
        </>
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      const color = row.original.status === 'declined' ? 'badge-label bg-danger-subtle text-danger badge-label fs-xs' : row.original.status === 'in-review' ? 'badge-label bg-info-subtle text-info fs-xs' : row.original.status === 'approved' ? 'badge-label bg-success-subtle text-success badge-label fs-xs' : row.original.status === 'pending' ? 'badge-label bg-warning-subtle text-warning fs-xs' : 'badge-label bg-secondary-subtle text-secondary fs-xs';
      return <span className={`badge ${color}`}>{toPascalCase(row.original.status)}</span>;
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
  const [data, setData] = useState(() => [...estimateData]);
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
            <input type="text" className="form-control" placeholder="Search clients..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button className="btn btn-primary" onClick={toggleModal}>
            <Icon icon="plus" className="fs-lg" /> New Estimation
          </Button>
          <EstimationsModal show={showModal} onHide={toggleModal} />

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Declined">Declined</option>
              <option value="Sent">Sent</option>
              <option value="In Review">In Review</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('value')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('value')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Value Range</option>
              <option value="0-5000">$0 - $5,000</option>
              <option value="5001-10000">$5,001 - $10,000</option>
              <option value="10001-20000">$10,001 - $20,000</option>
              <option value="20001-50000">$20,001 - $50,000</option>
              <option value="50000+">$50,000+</option>
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
      <DataTable table={table} emptyMessage="No records found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="customers" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="customers" />
    </Card>;
};
export default EstimationsTable;
const EstimationsModal = ({
  show,
  onHide
}) => {
  return <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Create New Estimation</ModalTitle>
      </ModalHeader>

      <Form id="createEstimationForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="estimationTitle">
                <FormLabel>Project Name</FormLabel>
                <FormControl type="text" placeholder="Enter project name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientName">
                <FormLabel>Client</FormLabel>
                <FormControl type="text" placeholder="Enter client name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimatedValue">
                <FormLabel>Estimated Value (USD)</FormLabel>
                <FormControl type="number" placeholder="e.g. 25000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimator">
                <FormLabel>Estimated By</FormLabel>
                <FormControl type="text" placeholder="Enter team member name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationStatus">
                <FormLabel>Status</FormLabel>
                <FormSelect required>
                  <option value="">Select status</option>
                  <option value="Approved">Approved</option>
                  <option value="In Review">In Review</option>
                  <option value="Pending">Pending</option>
                  <option value="Declined">Declined</option>
                  <option value="Sent">Sent</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationTags">
                <FormLabel>Tags</FormLabel>
                <FormControl type="text" placeholder="e.g. CRM, Mobile, API" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="createdDate">
                <FormLabel>Created Date</FormLabel>
                <Flatpickr className="form-control" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="expectedCloseDate">
                <FormLabel>Expected Close</FormLabel>
                <Flatpickr className="form-control" />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Estimation
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};