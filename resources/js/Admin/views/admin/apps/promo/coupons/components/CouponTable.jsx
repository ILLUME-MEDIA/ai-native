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
import { couponData } from './data';
const columnHelper = createColumnHelper();
const CouponTable = () => {
  const [data, setData] = useState(() => [...couponData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCouponModal, toggleCouponModal] = useToggle(false);
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
  }, columnHelper.accessor('code', {
    header: 'Coupon Code',
    cell: info => <>
          <h5 className="fs-sm mb-0">
            <a href="#!" className="link-reset">
              {info.getValue()}
            </a>
          </h5>
          <small className="text-muted">{info.row.original.details}</small>
        </>
  }), columnHelper.accessor(row => row.discount.type, {
    id: 'discountType',
    header: 'Discount Type',
    cell: ({
      row
    }) => <span className={`badge badge-label fs-xs ${row.original.discount.type === 'percentage' ? 'badge-soft-primary' : row.original.discount.type === 'fixed' ? 'badge-soft-secondary' : row.original.discount.type === 'free shipping' ? 'badge-soft-info' : ''}`}>
          {toPascalCase(row.original.discount.type)}
        </span>
  }), columnHelper.accessor(row => row.discount.value, {
    id: 'discountValue',
    header: 'Discount Value',
    cell: ({
      row
    }) => <span>{row.original.discount.value}</span>
  }), columnHelper.accessor('startDate', {
    header: 'Start Date'
  }), columnHelper.accessor('expiryDate', {
    header: 'Expiry Date'
  }), columnHelper.accessor('usageLimit', {
    header: 'Usage Limit'
  }), columnHelper.accessor('used', {
    header: 'Used'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`${row.original.status === 'active' ? 'text-success' : row.original.status === 'upcoming' ? 'text-warning' : row.original.status === 'expired' ? 'text-danger' : ''} fw-semibold`}>
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
          <Button size="sm" className="btn-default btn-icon btn-sm" title="Edit" onClick={() => toggleCouponModal()}>
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
            <input type="search" className="form-control" placeholder="Search coupon..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
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
              <option value="All">Coupon Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Disabled">Disabled</option>
            </FormSelect>
            <Icon icon="circle-check" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('discountType')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('discountType')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Coupon Type</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="free shipping">Free Shipping</option>
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

        <Button variant="danger" onClick={toggleCouponModal}>
          <Icon icon="plus" className="me-1" /> Add Coupon
        </Button>
      </CardHeader>

      <DataTable table={table} emptyMessage="No coupons found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="coupons" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="coupon" />

      <Modal show={showCouponModal} onHide={toggleCouponModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="ticket" className="me-2 text-primary" /> Add New Coupon
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>
                  Coupon Code <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" placeholder="e.g., SAVE20" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Coupon Type <span className="text-danger">*</span>
                </FormLabel>
                <FormSelect required>
                  <option>Select Type</option>
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                  <option>Free Shipping</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>
                  Discount Value <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="number" placeholder="e.g., 20 or 50" required />
              </Col>

              <Col md="6">
                <FormLabel>Minimum Order Value</FormLabel>
                <FormControl type="number" placeholder="e.g., 100" />
              </Col>

              <Col md="6">
                <FormLabel>
                  Start Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" placeholder="Select start date" />
              </Col>

              <Col md="6">
                <FormLabel>
                  End Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr data-date-format="d M, Y" className="form-control" placeholder="Select end date" />
              </Col>

              <Col md="6">
                <FormLabel>Usage Limit</FormLabel>
                <FormControl type="number" placeholder="e.g., 1000" />
              </Col>

              <Col md="6">
                <FormLabel>Per User Limit</FormLabel>
                <FormControl type="number" placeholder="e.g., 5" />
              </Col>

              <Col xs="12">
                <FormLabel>Description</FormLabel>
                <textarea className="form-control" rows={2} placeholder="Brief description of the offer" />
              </Col>

              <Col xs="12">
                <div className="d-flex flex-wrap gap-3 mt-2">
                  <FormCheck type="switch" id="isActive" label="Active" defaultChecked />
                  <FormCheck type="switch" id="isFeatured" label="Featured Coupon" />
                  <FormCheck type="switch" id="isFreeShipping" label="Free Shipping" />
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleCouponModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="plus" className="me-1" /> Add Coupon
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default CouponTable;