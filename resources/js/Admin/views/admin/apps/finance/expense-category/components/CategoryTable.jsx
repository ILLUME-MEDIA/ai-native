import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { categoryData } from './data';
const columnHelper = createColumnHelper();
const CategoryTable = () => {
  const [data, setData] = useState(() => [...categoryData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, toggleCategoryModal] = useToggle(false);
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

  // === Columns ===
  const columns = [{
    id: 'select',
    size: 45,
    header: ({
      table
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14 mt-0" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
    cell: ({
      row
    }) => <input type="checkbox" className="form-check-input form-check-input-light fs-14 mt-0" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
  }, columnHelper.accessor('id', {
    header: 'ID',
    cell: info => <a href="#!" className="fw-semibold link-reset">
          {info.getValue()}
        </a>
  }), columnHelper.accessor('name', {
    header: 'Category Name'
  }), columnHelper.accessor('expenses', {
    header: 'Total Expenses'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge badge-label ${row.original.status === 'active' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{toPascalCase(row.original.status)}</span>
  }), columnHelper.accessor('date', {
    header: 'Last Updated',
    cell: ({
      row
    }) => <>
          {row.original.date} <small className="text-muted">{row.original.time}</small>
        </>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex justify-content-end gap-1">
          <Button size="sm" className="btn-default btn-icon" title="Edit" onClick={() => toggleCategoryModal()}>
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
          {/* Search */}
          <div className="app-search">
            <input type="search" className="form-control" placeholder="Search categories..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleCategoryModal}>
            <Icon icon="plus" className="me-1" /> Add Category
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="me-2 fw-semibold">Filter By:</span>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option>Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </FormSelect>
            <Icon icon="circle-check" className="app-search-icon text-muted" />
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

      <DataTable table={table} emptyMessage="No categories found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="categories" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      {/* Delete Confirmation */}
      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="category" />

      {/* Add / Edit Modal */}
      <Modal show={showCategoryModal} onHide={toggleCategoryModal} centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="stack-2" className="me-1" /> Add Expense Category
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col xs="12">
                <FormLabel>
                  Category Name <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" placeholder="Enter category name" required />
              </Col>

              <Col xs="12">
                <FormLabel>Description</FormLabel>
                <textarea className="form-control" rows={3} placeholder="Optional notes about this category" />
              </Col>

              <Col xs="12">
                <FormLabel>Status</FormLabel>
                <FormSelect>
                  <option>Active</option>
                  <option>Inactive</option>
                </FormSelect>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleCategoryModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="device-floppy" className="me-1" /> Save Category
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default CategoryTable;