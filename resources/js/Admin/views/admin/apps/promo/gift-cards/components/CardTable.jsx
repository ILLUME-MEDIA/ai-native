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
import { giftCardData } from './data';
const columnHelper = createColumnHelper();
const CardTable = () => {
  const [data, setData] = useState(() => [...giftCardData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGiftModal, toggleGiftModal] = useToggle(false);
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
    header: 'Card Code',
    cell: info => <h5 className="fs-sm mb-0">
          <a href="#!" className="link-reset">
            {info.getValue()}
          </a>
        </h5>
  }), columnHelper.accessor('recipient', {
    header: 'Recipient',
    cell: ({
      row
    }) => <>
          {row.original.recipient.name}
          <br />
          <small className="text-muted">{row.original.recipient.email}</small>
        </>
  }), columnHelper.accessor('type', {
    header: 'Type',
    cell: ({
      row
    }) => <span className={`badge badge-label fs-xs ${row.original.type === 'digital' ? 'badge-soft-primary' : row.original.type === 'physical' ? 'badge-soft-secondary' : ''}`}>{toPascalCase(row.original.type)}</span>
  }), columnHelper.accessor('value', {
    header: 'Value',
    cell: ({
      row
    }) => <>{row.original.value}</>
  }), columnHelper.accessor('balance', {
    header: 'Balance',
    cell: ({
      row
    }) => <>{row.original.balance}</>
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`fw-semibold ${row.original.status === 'active' ? 'text-success' : row.original.status === 'redeemed' ? 'text-muted' : row.original.status === 'expired' ? 'text-danger' : row.original.status === 'pending' ? 'text-warning' : ''}`}>
          <Icon icon="circle-filled" className="fs-sm me-1" /> {toPascalCase(row.original.status)}
        </span>
  }), columnHelper.accessor('issuedOn', {
    header: 'Issued On'
  }), columnHelper.accessor('expiresOn', {
    header: 'Expires On'
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-sm btn-icon" title="View">
            <Icon icon="eye" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-sm btn-icon" title="Edit" onClick={() => toggleGiftModal()}>
            <Icon icon="edit" className="fs-lg" />
          </Button>
          <Button size="sm" className="btn-default btn-sm btn-icon" title="Delete" onClick={() => {
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
            <FormControl type="search" className="form-control" placeholder="Search gift card..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
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
              <option value="All">Status</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </FormSelect>
            <Icon icon="activity" className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('type')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('type')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Type</option>
              <option value="digital">Digital</option>
              <option value="physical">Physical</option>
            </FormSelect>
            <Icon icon="gift" className="app-search-icon text-muted" />
          </div>

          <div>
            <FormSelect className="form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>

        <Button variant="primary" onClick={toggleGiftModal}>
          <Icon icon="plus" className="me-1" /> Add Gift Card
        </Button>
      </CardHeader>

      <DataTable table={table} emptyMessage="No gift cards found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="gift cards" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="gift card" />

      <Modal show={showGiftModal} onHide={toggleGiftModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="gift" className="me-2 text-primary" /> Add New Gift Card
          </ModalTitle>
        </ModalHeader>

        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>
                  Gift Card Code <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" placeholder="e.g., GFT-A2025" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Type <span className="text-danger">*</span>
                </FormLabel>
                <FormSelect required>
                  <option>Select Type</option>
                  <option>Digital</option>
                  <option>Physical</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>
                  Gift Card Value ($) <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="number" placeholder="e.g., 100" required />
              </Col>

              <Col md="6">
                <FormLabel>Initial Balance</FormLabel>
                <FormControl type="number" placeholder="e.g., 100" />
              </Col>

              <Col md="6">
                <FormLabel>
                  Recipient Name <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" placeholder="e.g., John Doe" required />
              </Col>

              <Col md="6">
                <FormLabel>
                  Recipient Email <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="email" placeholder="e.g., john.doe@mail.com" required />
              </Col>

              <Col xs="12">
                <FormLabel>Personal Message</FormLabel>
                <textarea className="form-control" rows={2} placeholder="Write a short message to include with the gift card" />
              </Col>

              <Col md="6">
                <FormLabel>
                  Issue Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr className="form-control" placeholder="Select issue date" />
              </Col>

              <Col md="6">
                <FormLabel>
                  Expiry Date <span className="text-danger">*</span>
                </FormLabel>
                <Flatpickr className="form-control" placeholder="Select expiry date" />
              </Col>

              <Col xs="12">
                <div className="d-flex flex-wrap gap-3 mt-2">
                  <FormCheck type="switch" id="isActive" label="Active" defaultChecked />
                  <FormCheck type="switch" id="isDelivered" label="Send via Email" />
                  <FormCheck type="switch" id="isPhysical" label="Physical Delivery" />
                </div>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onClick={toggleGiftModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="plus" className="me-1" /> Add Gift Card
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default CardTable;