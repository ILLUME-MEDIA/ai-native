import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Card, CardFooter, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { projectData } from './data';
const columnHelper = createColumnHelper();
const OngoingProject = () => {
  const [data] = useState(projectData);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5
  });
  const columns = [
  // Project / Company
  columnHelper.accessor('name', {
    header: 'Project',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">{row.original.company}</span>
          <h5 className="fs-base mb-0">
            <a href="#" className="text-body">
              {row.original.name}
            </a>
          </h5>
        </>
  }),
  // Deadline
  columnHelper.accessor('deadline', {
    header: 'Deadline',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">Deadline</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.deadline}</h5>
        </>
  }),
  // Budget
  columnHelper.accessor('budget', {
    header: 'Budget',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">Budget</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.budget}</h5>
        </>
  }),
  // Assigned User
  columnHelper.accessor('user', {
    header: 'Assigned',
    cell: ({
      row
    }) => <div className="d-flex align-items-center">
          <img src={row.original.user.image} alt={row.original.user.name} className="avatar-sm rounded-circle me-2" />
          <div>
            <span className="text-muted fs-12">{row.original.user.role}</span>
            <h5 className="fs-base mb-0 fw-normal">{row.original.user.name}</h5>
          </div>
        </div>,
    enableSorting: false
  }),
  // Status
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({
      row
    }) => <>
          <span className="text-muted fs-12">Status</span>
          <h5 className="fs-base mb-0 fw-normal">
            <Icon icon="circle" className={`fs-12 ${row.original.status.className}`} /> {row.original.status.label}
          </h5>
        </>
  }),
  // Actions
  {
    id: 'actions',
    header: '',
    cell: () => <Dropdown>
          <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
            <Icon icon="dots-vertical" className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align="end">
            <DropdownItem>View Project</DropdownItem>
            <DropdownItem>Edit Project</DropdownItem>
            <DropdownItem>Archive Project</DropdownItem>
          </DropdownMenu>
        </Dropdown>,
    enableSorting: false,
    enableColumnFilter: false
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
        <CardTitle as="h4">Ongoing Projects</CardTitle>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search">
            <input type="text" className="form-control" placeholder="Search project..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
            <Icon icon="search" className="app-search-icon text-muted" />
          </div>

          <div>
            <select className="form-select form-control" value={pageSize} onChange={e => table.setPageSize(Number(e.target.value))}>
              {[5, 10, 15, 20, 50].map(size => <option key={size} value={size}>
                  {size}
                </option>)}
            </select>
          </div>
        </div>
      </CardHeader>

      <div className="bg-light bg-opacity-25 p-2 text-center border-bottom border-dashed">
        <p className="m-0">
          <b>{totalItems}</b> Active projects out of <span className="fw-medium">958</span>
        </p>
      </div>

      <DataTable table={table} emptyMessage="No projects found" className="table-custom table-centered table-hover" showHeaders={false} />

      {totalItems > 0 && <CardFooter className="border-0">
          <TablePagination totalItems={totalItems} start={start} end={end} itemsName="projects" showInfo previousPage={table.previousPage} canPreviousPage={table.getCanPreviousPage()} pageCount={table.getPageCount()} pageIndex={pageIndex} setPageIndex={table.setPageIndex} nextPage={table.nextPage} canNextPage={table.getCanNextPage()} />
        </CardFooter>}
    </Card>;
};
export default OngoingProject;