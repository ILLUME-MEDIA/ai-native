import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Form, FormCheck, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { discounts } from './data';
const columnHelper = createColumnHelper();
const DiscountTable = () => {
  const [data, setData] = useState(() => [...discounts]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscountModal, toggleDiscountModal] = useToggle(false);
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
  }, columnHelper.accessor('name', {
    header: 'Discount Name',
    cell: ({
      row
    }) => <h5 className="fs-sm mb-0">
          <a href="#!" className="link-reset">
            {row.original.name}
          </a>
          <br />
          <small className="text-muted">{row.original.details}</small>
        </h5>
  }), columnHelper.accessor('type', {
    header: 'Discount Type',
    cell: ({
      row
    }) => <span className={`badge badge-label fs-xs ${row.original.type === 'percentage' ? 'badge-soft-primary' : row.original.type === 'flat' ? 'badge-soft-success' : row.original.type === 'bogo' ? 'badge-soft-info' : ''} `}>{toPascalCase(row.original.type)}</span>
  }), columnHelper.accessor('value', {
    header: 'Discount Value'
  }), columnHelper.accessor('startDate', {
    header: 'Start Date'
  }), columnHelper.accessor('endDate', {
    header: 'End Date'
  }), columnHelper.accessor('minPurchase', {
    header: 'Min Purchase'
  }), columnHelper.accessor('maxDiscount', {
    header: 'Max Discount'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`fw-semibold ${row.original.status === 'active' ? 'text-success' : row.original.status === 'scheduled' ? 'text-warning' : row.original.status === 'expired' ? 'text-danger' : row.original.status === 'disabled' ? 'text-muted' : ''}`}>
          <Icon icon="circle-filled" className="fs-sm me-1" /> {toPascalCase(row.original.status)}
        </span>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-icon btn-sm" title="View">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon btn-sm" title="Edit" onClick={() => toggleDiscountModal()}>
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-icon btn-sm" title="Delete" onClick={() => {
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
            <FormControl type="search" className="form-control" placeholder="Search discount..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Discount Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="disabled">Disabled</option>
            </FormSelect>
            <Icon icon="activity" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('type')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('type')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Discount Type</option>
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
              <option value="bogo">BOGO</option>
            </FormSelect>
            <Icon icon="tag" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect className="form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>

        <Button variant="danger" onClick={toggleDiscountModal}>
          <Icon icon="plus" className="me-1" /> Add Discount
        </Button>
      </CardHeader>

      <DataTable table={table} emptyMessage="No discounts found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="discounts" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="discount" />

      <Modal show={showDiscountModal} onHide={toggleDiscountModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="tag" className="me-2 text-primary" /> Add New Discount
          </ModalTitle>
        </ModalHeader>

        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>
                  Discount Name <span className="text-danger">*</span>
                </FormLabel>
                <input type="text" className="form-control" name="discount_name" placeholder="e.g., Summer Sale" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Discount Code <span className="text-danger">*</span>
                </FormLabel>
                <input type="text" className="form-control" name="discount_code" placeholder="e.g., SUMMER25" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Discount Type <span className="text-danger">*</span>
                </FormLabel>
                <FormSelect name="discount_type" required>
                  <option>Select Type</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Flat">Flat Amount</option>
                  <option value="BOGO">Buy One Get One (BOGO)</option>
                  <option value="Bundle">Bundle Offer</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>
                  Discount Value <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="number" name="discount_value" placeholder="e.g., 25 (for 25%) or 50 (for $50)" required />
              </Col>

              <Col md="6">
                <FormLabel>Minimum Purchase ($)</FormLabel>
                <FormControl type="number" name="min_purchase" placeholder="e.g., 100" />
              </Col>

              <Col md="6">
                <FormLabel>Maximum Discount ($)</FormLabel>
                <FormControl type="number" name="max_discount" placeholder="e.g., 300" />
              </Col>

              <Col md="6">
                <FormLabel>
                  Start Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" placeholder="Select issue date" />
              </Col>

              <Col md="6">
                <FormLabel>
                  End Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" placeholder="Select expiry date" />
              </Col>

              <Col xs="12">
                <FormLabel>Description</FormLabel>
                <textarea className="form-control" name="discount_description" rows={2} placeholder="Short description about this discount..." />
              </Col>

              <Col xs="12">
                <div className="d-flex flex-wrap gap-3 mt-2">
                  <FormCheck type="switch" id="isActive" label="Active" defaultChecked />
                  <FormCheck type="switch" id="isDelivered" label="Auto Apply at Checkout" />
                  <FormCheck type="switch" id="isPhysical" label="Only for First Purchase" />
                </div>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onClick={toggleDiscountModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="plus" className="me-1" /> Add Discount
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default DiscountTable;