import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, CardTitle } from 'react-bootstrap';
import { productData } from './data';
import Icon from '@admin/components/wrappers/Icon';
const columnHelper = createColumnHelper();
const TopSellingProduct = () => {
  const [data] = useState(productData);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 6
  });
  const columns = [columnHelper.accessor('image', {
    header: '',
    cell: ({
      row
    }) => <img src={row.original.image} alt={row.original.name} height={36} width={36} />,
    enableSorting: false
  }), columnHelper.accessor('name', {
    header: 'Product',
    cell: ({
      row
    }) => <>
          <h5 className="m-0 fs-base">{row.original.name}</h5>
          <span className="text-muted fs-xs">By: {row.original.brand}</span>
        </>
  }), columnHelper.accessor('price', {
    header: 'Price',
    cell: ({
      row
    }) => <>
          <h5 className="m-0 fs-base">{row.original.price}</h5>
          <span className="text-muted fs-xs">Price</span>
        </>
  }), columnHelper.accessor('quantity', {
    header: 'Quantity',
    cell: ({
      row
    }) => <>
          <h5 className="m-0 fs-base">{row.original.quantity}</h5>
          <span className="text-muted fs-xs">Quantity</span>
        </>
  }), columnHelper.accessor('amount', {
    header: 'Amount',
    cell: ({
      row
    }) => <>
          <h5 className="m-0 fs-base">{row.original.amount}</h5>
          <span className="text-muted fs-xs">Amount</span>
        </>
  }), columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => {
      const statusMap = {
        'in-stock': 'success',
        'low-stock': 'warning',
        'out-of-stock': 'danger'
      };
      const labelMap = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'out-of-stock': 'Out of Stock'
      };
      return <span className={`badge bg-${statusMap[row.original.status]}-subtle text-${statusMap[row.original.status]} px-2 py-1 rounded-pill fs-12`}>
            {labelMap[row.original.status]}
          </span>;
    }
  })];
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card className="card-h-100">
      <CardHeader className="justify-content-between">
        <CardTitle as="h4">Top Selling Products</CardTitle>
        <div>
          <Button size="sm" className="btn-default me-1">
            <Icon icon="cloud-upload" className="me-1" /> 
            Export
          </Button>
          <Button size="sm" variant="light" className="me-1">
            <Icon icon="download" className="me-1" /> 
            Import
          </Button>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No products found" className="table-centered table-hover" showHeaders={false} />

      <CardFooter className="border-0">
        <TablePagination totalItems={totalItems} start={start} end={end} itemsName="products" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
      </CardFooter>
    </Card>;
};
export default TopSellingProduct;