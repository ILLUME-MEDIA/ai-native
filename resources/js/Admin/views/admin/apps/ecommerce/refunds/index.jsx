import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import RefundStatisticCard from './components/RefundStatisticCard';
import Refunds from './components/RefundTable';

// Stat card definitions — icon/colors stay fixed, values come from API
const STAT_META = [
  { key: 'total',    icon: 'credit-card-refund', title: 'Total Refund Requests', iconClassName: 'text-bg-primary',  badgeClassName: 'badge-soft-primary'  },
  { key: 'approved', icon: 'check',              title: 'Approved Refunds',       iconClassName: 'text-bg-success',  badgeClassName: 'badge-soft-success'  },
  { key: 'pending',  icon: 'alarm-snooze',        title: 'Pending Refunds',        iconClassName: 'text-bg-warning',  badgeClassName: 'badge-soft-warning'  },
  { key: 'rejected', icon: 'x',                  title: 'Rejected Refunds',       iconClassName: 'text-bg-danger',   badgeClassName: 'badge-soft-danger'   },
  { key: 'refunded', icon: 'bolt',               title: 'Fully Refunded',         iconClassName: 'text-bg-info',     badgeClassName: 'badge-soft-info'     },
];

const Page = () => {
  const [stats, setStats] = useState(null);

  const loadStats = () => {
    fetch('/api/admin/refunds/stats', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => setStats({ total: 0, approved: 0, pending: 0, rejected: 0, refunded: 0 }));
  };

  useEffect(() => { loadStats(); }, []);

  const statCards = STAT_META.map(m => ({
    ...m,
    value:  stats ? (stats[m.key] ?? 0) : null,
    change: 0, // no historical % data available
  }));

  return <>
    <PageBreadcrumb title="Refunds" subtitle="Ecommerce" />

    <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1">
      {statCards.map((item, idx) => (
        <Col key={idx}>
          {item.value === null ? (
            /* skeleton while loading */
            <div className="card mb-1">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="avatar-md flex-shrink-0">
                    <span className={`avatar-title rounded-circle fs-22 placeholder ${item.iconClassName}`}>&nbsp;</span>
                  </div>
                  <h3 className="mb-0 placeholder-glow"><span className="placeholder col-4" /></h3>
                </div>
                <p className="mb-0 placeholder-glow"><span className="placeholder col-8" /></p>
              </div>
            </div>
          ) : (
            <RefundStatisticCard item={item} />
          )}
        </Col>
      ))}
    </Row>

    <Row>
      <Col xs={12}>
        <Refunds onRefundProcessed={loadStats} />
      </Col>
    </Row>
  </>;
};
export default Page;
