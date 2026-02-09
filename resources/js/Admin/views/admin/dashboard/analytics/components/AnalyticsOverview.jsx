import DataTable from '@admin/components/table/DataTable';
import DeleteConfirmationModal from '@admin/components/table/DeleteConfirmationModal';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Button, Card, CardFooter, CardHeader, CardTitle } from 'react-bootstrap';
import { analyticData } from './data';
const columnHelper = createColumnHelper();
const AnalyticsOverview = () => {
  const [data, setData] = useState(() => [...analyticData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
  }, columnHelper.accessor('pagePath', {
    header: 'Page Path'
  }), columnHelper.accessor('source', {
    header: 'Top Referral Source'
  }), columnHelper.accessor('views', {
    header: 'Page Views',
    cell: ({
      row
    }) => <>
          <Icon icon="eye" className="me-1" /> {row.original.views.toLocaleString()}
        </>
  }), columnHelper.accessor('duration', {
    header: 'Avg Time on Page',
    cell: ({
      row
    }) => <>
          <Icon icon="clock" className="me-1" /> {row.original.duration}
        </>
  }), columnHelper.accessor('bounceRate', {
    header: 'Bounce Rate',
    cell: ({
      row
    }) => `${row.original.bounceRate}%`
  }), columnHelper.accessor('conversionRate', {
    header: 'Conversion Rate',
    cell: ({
      row
    }) => `${row.original.conversionRate}%`
  }), {
    header: 'Actions',
    cell: ({
      row
    }) => <div className="d-flex align-items-center justify-content-center gap-1">
          <Button size="sm" className="btn-default btn-icon" onClick={() => {
        setSelectedRowIds({
          [row.id]: true
        });
        setShowDeleteModal(true);
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
    enableRowSelection: true
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
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
  return <Card className="col-xl-9">
      <CardHeader className="border-light justify-content-between">
        <CardTitle as="h4">Page Analytics Overview</CardTitle>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search">
            <input type="text" className="form-control" placeholder="Search pages..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
          <div>
            <select className="form-select form-control" value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 10, 15, 20, 50].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </select>
          </div>

          {Object.keys(selectedRowIds).length > 0 && <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Delete Selected
            </Button>}
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No analytics found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="pages" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}

      <DeleteConfirmationModal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} onConfirm={handleDelete} selectedCount={Object.keys(selectedRowIds).length} itemName="pages" />
    </Card>;
};
export default AnalyticsOverview;