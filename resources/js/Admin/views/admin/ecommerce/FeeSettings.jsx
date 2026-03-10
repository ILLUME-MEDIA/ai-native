import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, CardHeader, CardBody, Button, Form, Badge } from 'react-bootstrap';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

const Toggle = ({ checked, onChange, id }) => (
  <div
    id={id}
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    style={{
      display: 'inline-flex', alignItems: 'center',
      width: '3rem', height: '1.5rem', borderRadius: 999,
      backgroundColor: checked ? '#0d6efd' : '#adb5bd',
      padding: 2, cursor: 'pointer', transition: 'background .2s',
    }}
  >
    <div style={{
      width: '1.1rem', height: '1.1rem', borderRadius: '50%',
      backgroundColor: '#fff', marginLeft: checked ? 'auto' : 0,
      transition: 'margin .2s', flexShrink: 0,
    }} />
  </div>
);

const FeeSettings = () => {
  const [loading, setSaving]      = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [toast, setToast]         = useState(null);
  const [newPct, setNewPct]       = useState('');

  const [form, setForm] = useState({
    platform_fee_type:          'percentage',
    platform_fee_value:         0,
    tip_enabled:                true,
    tip_suggested_percentages:  [10, 20, 30],
    tip_allow_custom:           true,
  });

  const showToast = (msg, variant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load current settings ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/admin/ecommerce-settings', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error();
      const rows = await res.json(); // array of { key, value, group, ... }

      const map = {};
      rows.forEach(r => {
        // value is a string; parse numbers and booleans
        let v = r.value;
        if (v === 'true')  v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(v) && v !== '' && v !== null) v = parseFloat(v);
        // Try JSON parse for arrays
        try { v = JSON.parse(r.value); } catch { /* use v as is */ }
        map[r.key] = v;
      });

      setForm(prev => ({
        platform_fee_type:         map.platform_fee_type         ?? prev.platform_fee_type,
        platform_fee_value:        map.platform_fee_value        ?? prev.platform_fee_value,
        tip_enabled:               map.tip_enabled               ?? prev.tip_enabled,
        tip_suggested_percentages: Array.isArray(map.tip_suggested_percentages)
          ? map.tip_suggested_percentages
          : prev.tip_suggested_percentages,
        tip_allow_custom:          map.tip_allow_custom          ?? prev.tip_allow_custom,
      }));
    } catch {
      showToast('Failed to load settings.', 'danger');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ecommerce-settings', {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept:         'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        body: JSON.stringify({
          platform_fee_type:         form.platform_fee_type,
          platform_fee_value:        parseFloat(form.platform_fee_value) || 0,
          tip_enabled:               form.tip_enabled,
          tip_suggested_percentages: form.tip_suggested_percentages.map(Number),
          tip_allow_custom:          form.tip_allow_custom,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Save failed');
      }
      showToast('Settings saved successfully.');
    } catch (e) {
      showToast(e.message || 'Failed to save.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // ── Suggested percentages helpers ─────────────────────────────────────────
  const addPct = () => {
    const val = parseFloat(newPct);
    if (!val || val < 1 || val > 100) return;
    if (form.tip_suggested_percentages.includes(val)) return;
    setForm(prev => ({
      ...prev,
      tip_suggested_percentages: [...prev.tip_suggested_percentages, val].sort((a, b) => a - b),
    }));
    setNewPct('');
  };

  const removePct = (p) => {
    setForm(prev => ({
      ...prev,
      tip_suggested_percentages: prev.tip_suggested_percentages.filter(x => x !== p),
    }));
  };

  if (fetching) {
    return (
      <>
        <PageBreadcrumb title="Fee & Tip Settings" subtitle="Ecommerce" />
        <div className="text-center py-5"><span className="spinner-border" /></div>
      </>
    );
  }

  return (
    <>
      <PageBreadcrumb title="Fee & Tip Settings" subtitle="Ecommerce" />

      {toast && (
        <div
          className={`alert alert-${toast.variant} py-2 px-3 position-fixed bottom-0 end-0 m-3 shadow`}
          style={{ zIndex: 9999, minWidth: 300 }}
        >
          {toast.msg}
        </div>
      )}

      <Row className="g-3">

        {/* ── Platform Fee ─────────────────────────────────────────────────── */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <span>Platform Fee</span>
                <Badge bg="secondary-subtle" text="secondary" className="fw-normal fs-xs">Global</Badge>
              </h5>
              <p className="text-muted mb-0 mt-1 fs-sm">
                This fee is added to every order. Individual restaurants can override or disable it.
              </p>
            </CardHeader>
            <CardBody>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Fee Type</Form.Label>
                  <div className="d-flex gap-3">
                    {[
                      { value: 'percentage', label: '% Percentage' },
                      { value: 'fixed',      label: '$ Fixed Amount' },
                    ].map(opt => (
                      <Form.Check
                        key={opt.value}
                        type="radio"
                        id={`fee-type-${opt.value}`}
                        name="platform_fee_type"
                        label={opt.label}
                        value={opt.value}
                        checked={form.platform_fee_type === opt.value}
                        onChange={e => setForm(prev => ({ ...prev, platform_fee_type: e.target.value }))}
                      />
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Fee Value
                    <span className="text-muted fw-normal ms-1 fs-sm">
                      {form.platform_fee_type === 'percentage'
                        ? '(e.g. 5 = 5% of subtotal)'
                        : '(e.g. 1.99 = $1.99 flat per order)'}
                    </span>
                  </Form.Label>
                  <div className="input-group" style={{ maxWidth: 200 }}>
                    {form.platform_fee_type === 'fixed' && (
                      <span className="input-group-text">$</span>
                    )}
                    <Form.Control
                      type="number"
                      min="0"
                      step={form.platform_fee_type === 'percentage' ? '0.5' : '0.01'}
                      value={form.platform_fee_value}
                      onChange={e => setForm(prev => ({ ...prev, platform_fee_value: e.target.value }))}
                    />
                    {form.platform_fee_type === 'percentage' && (
                      <span className="input-group-text">%</span>
                    )}
                  </div>
                  {parseFloat(form.platform_fee_value) === 0 && (
                    <Form.Text className="text-muted">Set to 0 to disable platform fee globally.</Form.Text>
                  )}
                </Form.Group>

                <div className="bg-light rounded p-3 fs-sm text-muted">
                  <strong>How it works:</strong><br />
                  This is the <em>global default</em> applied to all orders. Per-restaurant overrides (set in the Businesses page) take priority:
                  <ul className="mb-0 mt-1">
                    <li><strong>Inherit</strong> — uses this global value</li>
                    <li><strong>None</strong> — restaurant has no platform fee</li>
                    <li><strong>Percentage / Fixed</strong> — restaurant uses its own value</li>
                  </ul>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>

        {/* ── Tip Settings ────────────────────────────────────────────────── */}
        <Col xs={12} md={6}>
          <Card className="h-100">
            <CardHeader className="border-light">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <span>Tip Settings</span>
                <Badge bg="secondary-subtle" text="secondary" className="fw-normal fs-xs">Global</Badge>
              </h5>
              <p className="text-muted mb-0 mt-1 fs-sm">
                Configure tip options shown to customers after cart summary.
              </p>
            </CardHeader>
            <CardBody>
              <Form>
                {/* Enable tips */}
                <Form.Group className="mb-4 d-flex align-items-center justify-content-between">
                  <div>
                    <Form.Label className="fw-semibold mb-0">Enable Tips</Form.Label>
                    <p className="text-muted mb-0 fs-sm">Show tip options at checkout</p>
                  </div>
                  <Toggle
                    id="tip-enabled"
                    checked={!!form.tip_enabled}
                    onChange={v => setForm(prev => ({ ...prev, tip_enabled: v }))}
                  />
                </Form.Group>

                {form.tip_enabled && (
                  <>
                    {/* Suggested percentages */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">Suggested Tip Percentages</Form.Label>
                      <p className="text-muted fs-sm mb-2">
                        These are shown as quick-select buttons (e.g. 10%, 20%, 30%).
                        Amounts are calculated from the order subtotal.
                      </p>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {form.tip_suggested_percentages.map(p => (
                          <span
                            key={p}
                            className="badge bg-primary-subtle text-primary fs-sm d-inline-flex align-items-center gap-1"
                            style={{ fontSize: 13 }}
                          >
                            {p}%
                            <button
                              type="button"
                              className="btn-close btn-close-sm ms-1"
                              style={{ fontSize: 9 }}
                              onClick={() => removePct(p)}
                              title="Remove"
                            />
                          </span>
                        ))}
                        {form.tip_suggested_percentages.length === 0 && (
                          <span className="text-muted fst-italic fs-sm">No suggestions set</span>
                        )}
                      </div>
                      <div className="d-flex gap-2" style={{ maxWidth: 220 }}>
                        <Form.Control
                          type="number"
                          min="1"
                          max="100"
                          placeholder="e.g. 15"
                          value={newPct}
                          onChange={e => setNewPct(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPct())}
                        />
                        <Button variant="outline-primary" onClick={addPct} disabled={!newPct}>
                          Add
                        </Button>
                      </div>
                    </Form.Group>

                    {/* Allow custom */}
                    <Form.Group className="mb-3 d-flex align-items-center justify-content-between">
                      <div>
                        <Form.Label className="fw-semibold mb-0">Allow Custom Tip</Form.Label>
                        <p className="text-muted mb-0 fs-sm">
                          Let customer enter any amount or percentage
                        </p>
                      </div>
                      <Toggle
                        id="tip-custom"
                        checked={!!form.tip_allow_custom}
                        onChange={v => setForm(prev => ({ ...prev, tip_allow_custom: v }))}
                      />
                    </Form.Group>

                    {/* Live preview */}
                    <div className="bg-light rounded p-3">
                      <p className="fw-semibold mb-2 fs-sm">Preview (for $50 order):</p>
                      <div className="d-flex flex-wrap gap-2">
                        {form.tip_suggested_percentages.map(p => (
                          <span key={p} className="btn btn-outline-secondary btn-sm py-1 px-3">
                            {p}%
                            <span className="text-muted ms-1">${(50 * p / 100).toFixed(2)}</span>
                          </span>
                        ))}
                        {form.tip_allow_custom && (
                          <span className="btn btn-outline-danger btn-sm py-1 px-3">Custom</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Form>
            </CardBody>
          </Card>
        </Col>

        {/* ── Save button ──────────────────────────────────────────────────── */}
        <Col xs={12} className="d-flex justify-content-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
            style={{ minWidth: 140 }}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : 'Save Settings'
            }
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default FeeSettings;
