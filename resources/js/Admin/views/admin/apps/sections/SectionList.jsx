import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import DataTable from '@admin/components/table/DataTable';
import TablePagination from '@admin/components/table/TablePagination';
import Icon from '@admin/components/wrappers/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useInitialProps } from '@admin/context/InitialPropsContext';
import { Button, Card, CardFooter, CardHeader, Col, FormControl, Row } from 'react-bootstrap';
import { Link } from 'react-router';

const SectionList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  // hydrate from server if available
  const { entities } = useInitialProps ? useInitialProps() : { entities: null };

  const handleDelete = async (entity) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the table "${entity.table_name}" and all its data?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(entity.id);
    try {
      const res = await fetch(`/api/section-builder/entities/${entity.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Failed to delete table.');
        return;
      }
      setData((prev) => prev.filter((e) => e.id !== entity.id));
    } catch {
      alert('Network error while deleting table.');
    } finally {
      setDeleting(null);
    }
  };

  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
    }),
    columnHelper.accessor('table_name', {
      header: 'Table',
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
    }),
    columnHelper.accessor('total_rows', {
      header: 'Total Records',
      cell: ({ row }) => {
        const value = row.original.total_rows;
        if (value === null || value === undefined) return '—';
        return value.toLocaleString();
      },
      enableSorting: false,
    }),
    columnHelper.accessor('mcp_enabled', {
      header: 'MCP',
      cell: ({ row }) => (
        <span
          className={
            row.original.mcp_enabled
              ? 'badge bg-success-subtle text-success'
              : 'badge bg-secondary-subtle text-secondary'
          }
        >
          {row.original.mcp_enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
      enableSorting: false,
    }),
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="d-flex gap-1">
          <Link
            to={`/apps/sections/data/${row.original.id}`}
            className="btn btn-soft-primary btn-sm btn-icon"
            title="View table data"
          >
            <Icon icon="list" className="fs-lg" />
          </Link>
          <Link
            to={`/apps/sections/${row.original.id}/edit`}
            className="btn btn-default btn-sm btn-icon"
            title="Edit structure"
          >
            <Icon icon="edit" className="fs-lg" />
          </Link>
          <Button
            variant="soft-danger"
            size="sm"
            className="btn-icon"
            title="Delete table"
            disabled={deleting === row.original.id}
            onClick={() => handleDelete(row.original)}
          >
            <Icon icon={deleting === row.original.id ? 'loader' : 'trash'} className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ];

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 8,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  useEffect(() => {
    if (entities && Array.isArray(entities)) {
      setData(entities);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        // Use Section Builder meta endpoint so it can auto-sync missing DB tables.
        const res = await fetch('/api/section-builder/entities', {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to load sections');
        }

        const json = await res.json();
        // Section Builder entities endpoint returns a plain array of entities.
        setData(Array.isArray(json) ? json : json.data ?? []);
      } catch (e) {
        // keep silent, minimal handling
        // console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [entities]);

  return (
    <>
      <PageBreadcrumb title="Section Builder" subtitle="Admin" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <FormControl
                    type="search"
                    placeholder="Search sections..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <Icon icon="search" className="app-search-icon text-muted" />
                </div>
              </div>

              <div>
                <Link to="/apps/sections/create" className="btn btn-primary btn-sm">
                  <Icon icon="plus" className="me-1" />
                  Add Section
                </Link>
              </div>
            </CardHeader>

            <DataTable
              table={table}
              emptyMessage={loading ? 'Loading sections...' : 'No sections found'}
            />

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="sections"
                  showInfo
                  previousPage={table.previousPage}
                  canPreviousPage={table.getCanPreviousPage()}
                  pageCount={table.getPageCount()}
                  pageIndex={table.getState().pagination.pageIndex}
                  setPageIndex={table.setPageIndex}
                  nextPage={table.nextPage}
                  canNextPage={table.getCanNextPage()}
                />
              </CardFooter>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default SectionList;

