import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Button, Card, CardFooter, CardHeader, Col, FormControl, Row } from 'react-bootstrap';

import PageBreadcrumb from '@/Admin/PageBreadcrumb';
import DataTable from '@/Admin/components/table/DataTable';
import TablePagination from '@/Admin/components/table/TablePagination';
import Icon from '@/Admin/components/wrappers/Icon';

export default function SectionsIndex() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

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
                        href={route('admin.sections.edit', row.original.id)}
                        className="btn btn-default btn-sm btn-icon"
                    >
                        <Icon icon="pen" className="fs-lg" />
                    </Link>
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
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/entities/section_entities', {
                    headers: {
                        Accept: 'application/json',
                    },
                    credentials: 'include',
                });

                if (!res.ok) {
                    throw new Error('Failed to load sections');
                }

                const json = await res.json();
                setData(json.data ?? []);
            } catch (e) {
                // minimal handling
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="py-4">
            <PageBreadcrumb title="Section Builder" subtitle="Admin" />

            <Row className="justify-content-center">
                <Col xs={12}>
                    <Card>
                        <CardHeader className="border-light justify-content-between d-flex">
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
                                <Link
                                    href={route('admin.sections.create')}
                                    className="btn btn-primary d-inline-flex align-items-center"
                                >
                                    <Icon icon="plus" className="me-1" />
                                    New Section
                                </Link>
                            </div>
                        </CardHeader>

                        <DataTable
                            table={table}
                            emptyMessage={
                                loading ? 'Loading sections...' : 'No sections found'
                            }
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
        </div>
    );
}

