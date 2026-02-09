import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Link } from 'react-router';
import { useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle, FormControl } from 'react-bootstrap';
import { topCityWeatherData } from './data';
const columnHelper = createColumnHelper();
const TopCitiesWeather = () => {
  const [data] = useState(topCityWeatherData);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const columns = [columnHelper.accessor('city', {
    header: 'City',
    cell: ({
      row
    }) => <>
          <h5 className="fs-14 mb-0 fw-normal">{row.original.city}</h5>
          <span className="text-muted fs-12">{row.original.status}</span>
        </>
  }), columnHelper.accessor('temperature', {
    header: 'Temp'
  }), columnHelper.accessor('humidity', {
    header: 'Humidity'
  }), columnHelper.accessor('wind', {
    header: 'Wind'
  }), {
    header: '•••',
    cell: () => <Link to="" className="text-muted fs-20">
          <Icon icon="eye" />
        </Link>,
    enableSorting: false
  }];
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString'
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);
  return <Card>
      <CardHeader className="border-light justify-content-between">
        <CardTitle as="h4">Top Cities Weather</CardTitle>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search">
            <FormControl type="search" placeholder="Search city..." value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>
        </div>
      </CardHeader>

      <DataTable table={table} emptyMessage="No cities found" />

      {table.getRowModel().rows.length > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="cities" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default TopCitiesWeather;