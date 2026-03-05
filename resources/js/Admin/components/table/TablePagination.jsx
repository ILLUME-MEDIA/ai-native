import clsx from 'clsx';
import { Col, Row } from 'react-bootstrap';
import Icon from '../wrappers/Icon';

const WINDOW = 2; // pages to show around current

function getPageNumbers(pageIndex, pageCount) {
  if (pageCount <= 1) return [];

  const pages = [];
  const first = 0;
  const last  = pageCount - 1;

  const rangeStart = Math.max(first + 1, pageIndex - WINDOW);
  const rangeEnd   = Math.min(last  - 1, pageIndex + WINDOW);

  pages.push(first);

  if (rangeStart > first + 1) pages.push('...');

  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

  if (rangeEnd < last - 1) pages.push('...');

  if (last !== first) pages.push(last);

  return pages;
}

const TablePagination = ({
  // direct props
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
  perPage,
  onPerPageChange,
  perPageOptions = [15, 25, 50, 100],
  // tanstack table instance shortcut
  table,
  className = '',
}) => {
  // Allow passing a tanstack `table` instance directly
  if (table) {
    const state      = table.getState().pagination;
    const filtered   = table.getFilteredRowModel().rows.length;
    const _start     = filtered === 0 ? 0 : state.pageIndex * state.pageSize + 1;
    const _end       = Math.min((state.pageIndex + 1) * state.pageSize, filtered);
    totalItems       = filtered;
    start            = _start;
    end              = _end;
    showInfo         = true;
    previousPage     = () => table.previousPage();
    canPreviousPage  = table.getCanPreviousPage();
    pageCount        = table.getPageCount();
    pageIndex        = state.pageIndex;
    setPageIndex     = (p) => table.setPageIndex(p);
    nextPage         = () => table.nextPage();
    canNextPage      = table.getCanNextPage();
    perPage          = state.pageSize;
    onPerPageChange  = (n) => table.setPageSize(n);
  }

  const pages = getPageNumbers(pageIndex, pageCount);

  return (
    <Row className={clsx('align-items-center text-center text-sm-start g-2 px-3 py-2',
      showInfo ? 'justify-content-between' : 'justify-content-end',
      className)}>

      {showInfo && (
        <Col sm="auto">
          <div className="text-muted small">
            Showing <span className="fw-semibold">{start}</span>–<span className="fw-semibold">{end}</span> of{' '}
            <span className="fw-semibold">{totalItems?.toLocaleString()}</span> {itemsName}
          </div>
        </Col>
      )}

      {onPerPageChange && (
        <Col sm="auto">
          <div className="d-flex align-items-center gap-1">
            <span className="text-muted small">Show</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 72 }}
              value={perPage}
              onChange={e => onPerPageChange(Number(e.target.value))}
            >
              {perPageOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </Col>
      )}

      <Col sm="auto" className="mt-2 mt-sm-0">
        <ul className="pagination pagination-boxed mb-0 justify-content-center">
          <li className="page-item">
            <button className="page-link" onClick={() => setPageIndex(0)} disabled={!canPreviousPage} title="First">
              <Icon icon="chevrons-left" size={14} />
            </button>
          </li>
          <li className="page-item">
            <button className="page-link" onClick={() => previousPage()} disabled={!canPreviousPage} title="Previous">
              <Icon icon="chevron-left" size={14} />
            </button>
          </li>

          {pages.map((p, i) =>
            p === '...'
              ? (
                <li key={`ellipsis-${i}`} className="page-item disabled">
                  <span className="page-link px-2">…</span>
                </li>
              ) : (
                <li key={p} className={`page-item ${pageIndex === p ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPageIndex(p)}>
                    {p + 1}
                  </button>
                </li>
              )
          )}

          <li className="page-item">
            <button className="page-link" onClick={() => nextPage()} disabled={!canNextPage} title="Next">
              <Icon icon="chevron-right" size={14} />
            </button>
          </li>
          <li className="page-item">
            <button className="page-link" onClick={() => setPageIndex(pageCount - 1)} disabled={!canNextPage} title="Last">
              <Icon icon="chevrons-right" size={14} />
            </button>
          </li>
        </ul>
      </Col>
    </Row>
  );
};

export default TablePagination;
