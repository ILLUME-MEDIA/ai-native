import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, FormSelect } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import AddCategoryModal from './AddCategoryModal';
import { categoryData } from './data';
const columnHelper = createColumnHelper();
const CategoryTable = () => {
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
  }, columnHelper.accessor('name', {
    header: 'Category Name',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <div className="avatar-md me-3">
            <img src={row.original.image} alt="Product" height={36} width={36} className="img-fluid rounded" />
          </div>
          <div>
            <h5 className="mb-0">
              <Link to="" className="link-reset">
                {row.original.name}
              </Link>
            </h5>
          </div>
        </div>
  }), columnHelper.accessor('slug', {
    header: 'Slug'
  }), columnHelper.accessor('products', {
    header: 'Products',
    cell: ({
      row
    }) => <h5 className="fs-base mb-0 fw-medium">{row.original.products}</h5>,
    filterFn: 'equalsString',
    enableColumnFilter: true
  }), columnHelper.accessor('orders', {
    header: 'Orders'
  }), columnHelper.accessor('earnings', {
    header: 'Earnings',
    enableColumnFilter: true
  }), columnHelper.accessor('lastModifiedDate', {
    header: 'Last Modified',
    cell: ({
      row
    }) => <>
          {row.original.lastModifiedDate}
          <small className="text-muted">{row.original.lastModifiedTime}</small>
        </>
  }), columnHelper.accessor('status', {
    header: 'Status',
    filterFn: 'equalsString',
    enableColumnFilter: true,
    cell: ({
      row
    }) => <span className={`badge ${row.original.status === 'active' ? 'badge-soft-success' : 'badge-soft-danger'} fs-xxs`}>{toPascalCase(row.original.status)}</span>
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex  gap-1">
          <button className="btn-icon btn btn-sm btn-default">
            <Icon icon="eye" className="fs-lg" />
          </button>
          <button className="btn-icon btn btn-sm btn-default">
            <Icon icon="edit" className="fs-lg" />
          </button>
          <button className="btn-icon btn btn-sm btn-default" onClick={() => {
        toggleDeleteModal();
        setSelectedRowIds({
          [row.id]: true
        });
      }}>
            <Icon icon="trash" className="fs-lg" />
          </button>
        </div>
  }];
  const [showModal, toggleModal] = useToggle(false);
  const [data, setData] = useState(() => [...categoryData]);
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
            <input type="search" className="form-control" placeholder="Search category..." />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          <button className="btn btn-danger d-none">Delete</button>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div>
            <FormSelect className="form-control my-1 my-md-0" value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 10, 15, 20].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </FormSelect>
          </div>

          <div className="app-search">
            <FormSelect className="form-control my-1 my-md-0" value={table.getColumn('status')?.getFilterValue() ?? 'All'} onChange={e => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </FormSelect>
            <Icon icon="circle" className="app-search-icon text-muted" />
          </div>
          <Button variant="primary" className="ms-1" onClick={toggleModal}>
            <Icon icon="plus" className="fs-sm me-2" /> Add Category
          </Button>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No records found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="products" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={table.getState().pagination.pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={toggleDeleteModal} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="product" />

      <AddCategoryModal show={showModal} handleClose={toggleModal} />
    </Card>;
};
export default CategoryTable;