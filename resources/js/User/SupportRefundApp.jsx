/**
 * SupportRefundApp — Main entry point for user-facing Support + Refund system.
 *
 * Embed this on your customer site (separate domain).
 * Works with polling (no WebSocket/cPanel friendly).
 *
 * Usage:
 *   import SupportRefundApp from './SupportRefundApp';
 *
 *   <SupportRefundApp
 *     apiBase="https://admin.yourdomain.com"
 *     authHeader="Bearer <otp_token>"   // optional, for logged-in users
 *     sessionId="uuid-session-id"        // for guest users
 *   />
 *
 * The widget auto-loads user's orders, shows Support and Refund tabs.
 */

import { useEffect, useState } from 'react';
import RefundWidget    from './components/RefundWidget';
import SupportChat     from './components/SupportChat';
import SupportTickets  from './components/SupportTickets';

const TABS = [
  { key: 'support', label: '💬 Support' },
  { key: 'refund',  label: '💰 Refund'  },
];

const SupportRefundApp = ({ apiBase = '', authHeader = '', sessionId = '' }) => {
  const [tab,        setTab]        = useState('support');
  const [orders,     setOrders]     = useState([]);
  const [chatTicket, setChatTicket] = useState(null); // ticketId when chat open

  const headers = {
    Accept: 'application/json',
    ...(authHeader ? { Authorization: authHeader }  : {}),
    ...(sessionId  ? { 'X-Session-Id': sessionId } : {}),
  };

  // Load user's orders
  useEffect(() => {
    fetch(`${apiBase}/api/my-orders?per_page=50`, { headers })
      .then(r => r.json())
      .then(res => setOrders(res.data ?? []))
      .catch(() => {});
  }, [apiBase, authHeader, sessionId]);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden', minHeight: 400 }}>

      {/* Top tab bar — hidden when chat is open */}
      {!chatTicket && (
        <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: tab === t.key ? 700 : 400,
                color:      tab === t.key ? '#0d6efd' : '#6c757d',
                borderBottom: tab === t.key ? '2px solid #0d6efd' : '2px solid transparent',
                marginBottom: -2,
                fontSize: '0.9rem',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ minHeight: 360 }}>
        {chatTicket ? (
          // Full-height chat view
          <div style={{ height: 480, display: 'flex', flexDirection: 'column' }}>
            <SupportChat
              ticketId={chatTicket}
              apiBase={apiBase}
              authHeader={authHeader}
              sessionId={sessionId}
              onClose={() => setChatTicket(null)}
            />
          </div>
        ) : tab === 'support' ? (
          <SupportTickets
            apiBase={apiBase}
            authHeader={authHeader}
            sessionId={sessionId}
            orders={orders}
            onOpenChat={(id) => setChatTicket(id)}
          />
        ) : (
          <RefundWidget
            apiBase={apiBase}
            authHeader={authHeader}
            sessionId={sessionId}
            orders={orders}
          />
        )}
      </div>
    </div>
  );
};

export default SupportRefundApp;
