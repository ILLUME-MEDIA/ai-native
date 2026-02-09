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
import { holidayData } from './data';

// Table setup
const columnHelper = createColumnHelper();
const HolidayTable = () => {
  const [data, setData] = useState(() => [...holidayData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHolidayModal, toggleHolidayModal] = useToggle(false);
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
  }, columnHelper.accessor('name', {
    header: 'Holiday Name',
    cell: ({
      row
    }) => <span className="fw-semibold">{row.original.name}</span>
  }), columnHelper.accessor('date', {
    header: 'Date'
  }), columnHelper.accessor('day', {
    header: 'Day'
  }), columnHelper.accessor('description', {
    header: 'Description'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'active' ? 'bg-success-subtle text-success' : row.original.status === 'optional' ? 'bg-info-subtle text-info' : ''}`}>{toPascalCase(row.original.status)}</span>
  }), columnHelper.accessor('optional', {
    header: 'Optional',
    cell: ({
      row
    }) => <span>{toPascalCase(row.original.optional)}</span>
  }), columnHelper.accessor('createdOn', {
    header: 'Created On'
  }), columnHelper.accessor('addedBy', {
    header: 'Approved By'
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex align-items-center justify-content-end gap-1">
          <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleHolidayModal()}>
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
            <input type="search" className="form-control" placeholder="Search holidays..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button variant="primary" onClick={toggleHolidayModal}>
            <Icon icon="plus" className="me-1" /> Add Holiday
          </Button>

          <div>
            <FormSelect className="form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 8, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No holidays found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="holidays" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="holiday" />

      <Modal show={showHolidayModal} onHide={toggleHolidayModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="calendar-plus" className="me-1" /> Add New Holiday
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>Holiday Name</FormLabel>
                <FormControl type="text" placeholder="Enter holiday name" required />
              </Col>

              <Col md="6">
                <FormLabel>Date</FormLabel>
                <Flatpickr className="form-control" data-date-format="d M, Y" />
              </Col>

              <Col md="6">
                <FormLabel>Day</FormLabel>
                <FormSelect required>
                  <option>Select day</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel>
                  Optional Holiday <span className="text-danger">*</span>
                </FormLabel>
                <FormSelect required>
                  <option>Select option</option>
                  <option value="No">No (Federal)</option>
                  <option value="Yes">Yes (Optional)</option>
                </FormSelect>
              </Col>

              <Col md="12">
                <FormLabel>Description</FormLabel>
                <textarea className="form-control" rows={3} placeholder="Enter description" />
              </Col>

              <Col md="6">
                <FormLabel>Added By</FormLabel>
                <FormControl type="text" placeholder="Admin" />
              </Col>

              <Col md="6">
                <FormLabel>Status</FormLabel>
                <FormSelect required>
                  <option>Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </FormSelect>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleHolidayModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="device-floppy" className="me-1" /> Save Holiday
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default HolidayTable;