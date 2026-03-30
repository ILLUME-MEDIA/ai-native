import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import TicketTable from './components/TicketTable';

const STAT_META = [
  { key: 'total',       icon: 'ticket',        title: 'Total Tickets',    iconClassName: 'text-bg-primary', badgeClassName: 'badge-soft-primary' },
  { key: 'open',        icon: 'mail-opened',   title: 'Open',             iconClassName: 'text-bg-info',    badgeClassName: 'badge-soft-info'    },
  { key: 'in_progress', icon: 'loader',        title: 'In Progress',      iconClassName: 'text-bg-warning', badgeClassName: 'badge-soft-warning' },
  { key: 'resolved',    icon: 'circle-check',  title: 'Resolved',         iconClassName: 'text-bg-success', badgeClassName: 'badge-soft-success' },
  { key: 'unread',      icon: 'bell-ringing',  title: 'Unread Messages',  iconClassName: 'text-bg-danger',  badgeClassName: 'badge-soft-danger'  },
];

const StatCard = ({ item }) => (
  <div className="card mb-1">
    <div className="card-body">
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className={`flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center ${item.iconClassName}`}
          style={{ width: 52, height: 52, fontSize: 22 }}
        >
          <Icon icon={item.icon} />
        </div>
        <h3 className="mb-0 fw-bold" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{item.value ?? 0}</h3>
      </div>
      <p className="mb-0">{item.title}</p>
    </div>
  </div>
);

const SkeletonCard = ({ item }) => (
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
);

const Page = () => {
  const [stats, setStats] = useState(null);

  const loadStats = () => {
    fetch('/api/admin/support/tickets/stats', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => setStats({ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 }));
  };

  useEffect(() => { loadStats(); }, []);

  return <>
    <PageBreadcrumb title="Issue Manager" subtitle="Ecommerce" />

    <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1">
      {STAT_META.map((m, idx) => (
        <Col key={idx}>
          {stats === null
            ? <SkeletonCard item={m} />
            : <StatCard item={{ ...m, value: stats[m.key] ?? 0 }} />
          }
        </Col>
      ))}
    </Row>

    <Row>
      <Col xs={12}>
        <TicketTable onTicketUpdated={loadStats} />
      </Col>
    </Row>
  </>;
};

export default Page;
