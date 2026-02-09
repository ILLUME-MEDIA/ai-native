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
import { departmentData } from './data';
const columnHelper = createColumnHelper();
const DepartmentTable = () => {
  const [data, setData] = useState(() => [...departmentData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showModal, toggleModal] = useToggle(false);
  const toggleDeleteModal = () => setShowDeleteModal(!showDeleteModal);
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
    header: 'Department Name'
  }), columnHelper.accessor('code', {
    header: 'Department Code'
  }), columnHelper.accessor('head.name', {
    header: 'Head of Department (HOD)',
    cell: ({
      row
    }) => <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-xs">
            <img src={row.original.head.image} alt={row.original.head.name} className="img-fluid rounded-circle" />
          </div>
          <span>{row.original.head.name}</span>
        </div>
  }), columnHelper.accessor('totalStaff', {
    header: 'Total Staff'
  }), columnHelper.accessor('date', {
    header: 'Established'
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'active' ? 'bg-success-subtle text-success' : row.original.status === 'inactive' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'} badge-label`}>{toPascalCase(row.original.status)}</span>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex align-items-center justify-content-center gap-1">
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

  // Table setup
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
            <input type="search" className="form-control" placeholder="Search department..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <Button variant="primary" onClick={toggleModal}>
            <Icon icon="plus" className="me-1" /> New Department
          </Button>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={toggleDeleteModal}>
              Delete
            </Button>}
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="me-2 fw-semibold">Filter By:</span>
          <div className="app-search">
            <FormSelect className="form-control" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">Department Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Hold">On Hold</option>
              <option value="Restructuring">Restructuring</option>
            </FormSelect>
            <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
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

      <DataTable table={table} emptyMessage="No departments found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="departments" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="departments" />

      {/* Add Department Modal */}
      <Modal show={showModal} onHide={toggleModal} size="lg" centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5">
            <Icon icon="layout-grid" className="me-1"></Icon>
            Add New Department
          </ModalTitle>
        </ModalHeader>
        <Form>
          <ModalBody>
            <Row className="g-3">
              <Col md="6">
                <FormLabel>Department Name</FormLabel>
                <FormControl type="text" placeholder="Enter department name" required />
              </Col>
              <Col md="6">
                <FormLabel>Department Code</FormLabel>
                <FormControl type="text" placeholder="e.g. DEP123" required />
              </Col>
              <Col md="6">
                <FormLabel className="fw-semibold">Head of Department (HOD)</FormLabel>
                <FormSelect id="hodSelect" name="hod">
                  <option>Select HOD</option>
                  <option value="Samantha Green">Samantha Green</option>
                  <option value="Ethan Johnson">Ethan Johnson</option>
                  <option value="David Miller">David Miller</option>
                  <option value="Olivia Brown">Olivia Brown</option>
                  <option value="Isabella Lee">Isabella Lee</option>
                  <option value="Michael Scott">Michael Scott</option>
                </FormSelect>
              </Col>

              <Col md="6">
                <FormLabel className="fw-semibold">Department Type</FormLabel>
                <FormSelect id="departmentType" name="department_type">
                  <option>Select Type</option>
                  <option value="Core">Core</option>
                  <option value="Support">Support</option>
                  <option value="Technical">Technical</option>
                  <option value="Creative">Creative</option>
                  <option value="Administrative">Administrative</option>
                </FormSelect>
              </Col>
              <Col md="6">
                <FormLabel>Total Staff</FormLabel>
                <input type="number" className="form-control" placeholder="e.g. 25" />
              </Col>
              <Col md="6">
                <FormLabel>Established Date</FormLabel>
                <Flatpickr className="form-control" required />
              </Col>
              <Col md="6">
                <FormLabel>Status</FormLabel>
                <FormSelect>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Restructuring">Restructuring</option>
                </FormSelect>
              </Col>

              <Col xs="12">
                <FormLabel className="fw-semibold">Description</FormLabel>
                <textarea id="description" name="description" className="form-control" rows={3} placeholder="Brief overview of the department..." />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={toggleModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="check" className="me-1" />
              Save Department
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Card>;
};
export default DepartmentTable;