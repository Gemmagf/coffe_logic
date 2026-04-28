import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import { getOrders, createOrder, updateOrderStatus, deleteOrder } from '../api/orders';
import { getOrdersAnalytics, type OrdersAnalytics } from '../api/analytics';
import { getLocations } from '../api/locations';
import type { Order, OrderStatus, Location, OrderItem } from '../types';
import client from '../api/client';

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: '#E8A838',
  SENT: '#4f7bdb',
  RECEIVED: '#5aab7a',
};

export default function Comandes() {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<OrderStatus, string> = {
    DRAFT: t('orders.status.DRAFT'),
    SENT: t('orders.status.SENT'),
    RECEIVED: t('orders.status.RECEIVED'),
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<OrdersAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [orderingFor, setOrderingFor] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  const emptyItem = (): OrderItem => ({ productName: '', quantity: 1, unit: 'kg', unitPrice: 0 });

  const [form, setForm] = useState({
    supplierId: '',
    locationId: '',
    notes: '',
    deliveryAt: '',
    items: [emptyItem()],
  });

  const fetchOrders = () => {
    getOrders({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterLocation ? { locationId: filterLocation } : {}),
    }).then(setOrders).catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      getLocations(),
      client.get('/suppliers').then((r) => r.data.data),
      getOrdersAnalytics(),
    ])
      .then(([locs, sups, anal]) => {
        setLocations(locs);
        setSuppliers(sups);
        setAnalytics(anal);
        if (anal.suggestions.length > 0) setShowAnalytics(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [filterStatus, filterLocation]);

  const handleAddItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });

  const handleItemChange = (idx: number, field: keyof OrderItem, value: string | number) => {
    const items = form.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setForm({ ...form, items });
  };

  const handleRemoveItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrder({
        supplierId: form.supplierId,
        locationId: form.locationId,
        items: form.items,
        notes: form.notes || null,
        deliveryAt: form.deliveryAt ? new Date(form.deliveryAt).toISOString() : null,
      });
      setShowForm(false);
      setForm({ supplierId: '', locationId: '', notes: '', deliveryAt: '', items: [emptyItem()] });
      fetchOrders();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    fetchOrders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('orders.deleteConfirm'))) return;
    await deleteOrder(id);
    fetchOrders();
  };

  const handleQuickOrder = async (supplierId: string, supplierName: string) => {
    if (!selectedLocation) { alert(t('orders.selectLocation')); return; }
    const sugs = analytics?.suggestions.filter((s) => s.supplierId === supplierId) ?? [];
    if (sugs.length === 0) return;
    try {
      await createOrder({
        supplierId,
        locationId: selectedLocation,
        items: sugs.map((s) => ({ productName: s.productName, quantity: s.suggestedQty, unit: s.unit, unitPrice: 0 })),
        notes: `Comanda automàtica — ${new Date().toLocaleDateString('ca')}`,
        deliveryAt: null,
      });
      setOrderSuccess(`Comanda creada per ${supplierName}`);
      setOrderingFor(null);
      fetchOrders();
      setTimeout(() => setOrderSuccess(''), 4000);
    } catch (e) { console.error(e); }
  };

  const totalOrder = (items: OrderItem[]) =>
    items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2);

  if (loading) return <div style={{ padding: 40, color: '#888' }}>{t('common.loading')}</div>;

  const overdueCount = analytics?.supplierFrequency.filter((s) => s.overdue).length ?? 0;

  return (
    <div>
      <Header
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {overdueCount > 0 && (
              <button
                style={{ ...styles.alertBtn, ...(showAnalytics ? styles.alertBtnActive : {}) }}
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {overdueCount} {overdueCount !== 1 ? t('orders.pendingPlural') : t('orders.pending')}
              </button>
            )}
            <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('orders.cancel') : t('orders.newOrder')}
            </button>
          </div>
        }
      />

      {/* ── Panell suggeriments ─────────────────────────────────────────── */}
      {showAnalytics && analytics && analytics.suggestions.length > 0 && (
        <div style={styles.analyticsPanel}>
          <div style={styles.analyticsPanelHeader}>
            <span style={styles.analyticsPanelTitle}>{t('orders.recommendedOrders')}</span>
            <span style={styles.analyticsPanelSub}>{t('orders.overdueSubtitle')}</span>
          </div>

          {orderSuccess && <div style={styles.successBanner}>{orderSuccess}</div>}

          <div style={styles.quickOrderBar}>
            <span style={styles.label}>{t('orders.destinationLocation')}</span>
            <select style={styles.filterSelect} value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
              <option value="">{t('orders.selectLocation')}</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {Array.from(new Set(analytics.suggestions.map((s) => s.supplierId))).map((supId) => {
            const supSuggestions = analytics.suggestions.filter((s) => s.supplierId === supId);
            const supName = supSuggestions[0].supplierName;
            const sup = analytics.supplierFrequency.find((sf) => sf.supplierId === supId);
            return (
              <div key={supId} style={styles.suggestionBlock}>
                <div style={styles.suggestionRow}>
                  <div>
                    <span style={styles.supplierName}>{supName}</span>
                    {sup && <span style={styles.overdueTag}>Fa {sup.daysSinceLast} dies · habitual cada {sup.avgIntervalDays}d</span>}
                    <div style={styles.suggestionItems}>
                      {supSuggestions.map((s, i) => (
                        <span key={i} style={styles.suggestionChip}>{s.productName} · {s.suggestedQty} {s.unit}</span>
                      ))}
                    </div>
                  </div>
                  {orderingFor === supId ? (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button style={styles.confirmBtn} onClick={() => handleQuickOrder(supId, supName)}>{t('orders.confirm')}</button>
                      <button style={styles.cancelBtn} onClick={() => setOrderingFor(null)}>{t('orders.cancel')}</button>
                    </div>
                  ) : (
                    <button style={styles.quickOrderBtn} onClick={() => setOrderingFor(supId)}>{t('orders.quickOrder')}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Formulari nova comanda ───────────────────────────────────────── */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>{t('orders.newOrderForm')}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label style={styles.label}>{t('orders.supplier')}</label>
                <select style={styles.input} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
                  <option value="">{t('orders.selectSupplier')}</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('schedules.location')}</label>
                <select style={styles.input} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required>
                  <option value="">{t('orders.selectLocation')}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('orders.deliveryDate')}</label>
                <input type="date" style={styles.input} value={form.deliveryAt} onChange={(e) => setForm({ ...form, deliveryAt: e.target.value })} />
              </div>
            </div>

            <div style={styles.itemsSection}>
              <div style={styles.itemsHeader}>
                <span style={styles.label}>{t('orders.products')}</span>
                <button type="button" style={styles.addItemBtn} onClick={handleAddItem}>{t('orders.addProduct')}</button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <input style={{ ...styles.input, flex: 2 }} placeholder={t('orders.productName')} value={item.productName}
                    onChange={(e) => handleItemChange(idx, 'productName', e.target.value)} required />
                  <input style={{ ...styles.input, width: 70 }} type="number" placeholder={t('orders.qty')} value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))} min="0.01" step="0.01" required />
                  <input style={{ ...styles.input, width: 60 }} placeholder={t('orders.unit')} value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} required />
                  <input style={{ ...styles.input, width: 80 }} type="number" placeholder={t('orders.pricePerUnit')} value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))} min="0" step="0.01" required />
                  {form.items.length > 1 && (
                    <button type="button" style={styles.removeBtn} onClick={() => handleRemoveItem(idx)}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.notes')}</label>
              <input type="text" style={styles.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('schedules.optional')} />
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="submit" style={styles.primaryBtn}>{t('orders.createOrder')}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div style={styles.filters}>
        <select style={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as OrderStatus | '')}>
          <option value="">{t('orders.allStatuses')}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={styles.filterSelect} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">{t('orders.allLocations')}</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* ── Llista de comandes ───────────────────────────────────────────── */}
      <div style={styles.ordersList}>
        {orders.length === 0 ? (
          <p style={styles.empty}>{t('orders.noOrders')}</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <div>
                  <span style={styles.supplierNameBig}>{order.supplier.name}</span>
                  <span style={styles.locationName}>{order.location.name}</span>
                </div>
                <div style={styles.orderMeta}>
                  <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span style={styles.orderDate}>{format(new Date(order.createdAt), 'd MMM yyyy')}</span>
                </div>
              </div>

              <div style={styles.orderItems}>
                {(order.items as OrderItem[]).map((item, i) => (
                  <span key={i} style={styles.itemChip}>
                    {item.productName} · {item.quantity} {item.unit}
                  </span>
                ))}
              </div>

              <div style={styles.orderFooter}>
                <span style={styles.orderTotal}>{t('orders.total')} {totalOrder(order.items as OrderItem[])}</span>
                <div style={styles.orderActions}>
                  {order.status === 'DRAFT' && (
                    <button style={styles.actionBtn} onClick={() => handleStatusChange(order.id, 'SENT')}>{t('orders.send')}</button>
                  )}
                  {order.status === 'SENT' && (
                    <button style={{ ...styles.actionBtn, backgroundColor: '#5aab7a', color: '#fff', borderColor: '#5aab7a' }}
                      onClick={() => handleStatusChange(order.id, 'RECEIVED')}>{t('orders.markReceived')}</button>
                  )}
                  {order.status !== 'RECEIVED' && (
                    <button style={styles.deleteBtn} onClick={() => handleDelete(order.id)}>{t('orders.delete')}</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  primaryBtn: { padding: '9px 18px', backgroundColor: '#2D3250', color: '#F4E285', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  alertBtn: { padding: '8px 14px', backgroundColor: '#fff3cd', color: '#92400e', border: '1.5px solid #F4E285', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  alertBtnActive: { backgroundColor: '#F4E285', color: '#2D3250' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(45,50,80,0.07)' },
  formTitle: { fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#2D3250' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: { padding: '8px 10px', border: '1.5px solid #e2ddd5', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#faf9f7' },
  itemsSection: { marginBottom: 16 },
  itemsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addItemBtn: { fontSize: 12, color: '#4f7bdb', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 },
  itemRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  removeBtn: { background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 18 },
  filters: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  filterSelect: { padding: '7px 10px', border: '1.5px solid #e2ddd5', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { color: '#aaa', fontSize: 13 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(45,50,80,0.06)' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  supplierNameBig: { fontSize: 15, fontWeight: 700, color: '#2D3250', display: 'block' },
  locationName: { fontSize: 12, color: '#999', display: 'block', marginTop: 2 },
  orderMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' },
  orderDate: { fontSize: 11, color: '#bbb' },
  orderItems: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  itemChip: { fontSize: 11, backgroundColor: '#F5F3EC', borderRadius: 20, padding: '3px 10px', color: '#666' },
  orderFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 14, fontWeight: 700, color: '#2D3250' },
  orderActions: { display: 'flex', gap: 8 },
  actionBtn: { padding: '6px 14px', border: '1.5px solid #2D3250', borderRadius: 6, background: 'transparent', color: '#2D3250', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  deleteBtn: { padding: '6px 14px', border: '1.5px solid #c0392b', borderRadius: 6, background: 'transparent', color: '#c0392b', fontSize: 12, cursor: 'pointer' },
  // Analytics panel
  analyticsPanel: { backgroundColor: '#fffbea', border: '1.5px solid #F4E285', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
  analyticsPanelHeader: { marginBottom: 12 },
  analyticsPanelTitle: { fontSize: 14, fontWeight: 700, color: '#2D3250', display: 'block' },
  analyticsPanelSub: { fontSize: 11, color: '#a08a00', display: 'block', marginTop: 2 },
  successBanner: { backgroundColor: '#d1fae5', color: '#065f46', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 13 },
  quickOrderBar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  suggestionBlock: { backgroundColor: '#fff', border: '1px solid #f0e9c5', borderRadius: 8, padding: '12px 14px', marginBottom: 8 },
  suggestionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  supplierName: { fontSize: 13, fontWeight: 700, color: '#2D3250', display: 'block', marginBottom: 2 },
  overdueTag: { fontSize: 11, color: '#c0392b', display: 'block', marginBottom: 6 },
  suggestionItems: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  suggestionChip: { fontSize: 11, backgroundColor: '#F5F3EC', borderRadius: 20, padding: '2px 9px', color: '#666' },
  quickOrderBtn: { padding: '6px 14px', border: '1.5px solid #2D3250', borderRadius: 6, background: 'transparent', color: '#2D3250', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  confirmBtn: { padding: '6px 14px', border: 'none', borderRadius: 6, background: '#2D3250', color: '#F4E285', fontSize: 12, cursor: 'pointer', fontWeight: 700 },
  cancelBtn: { padding: '6px 14px', border: '1.5px solid #ddd', borderRadius: 6, background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer' },
};
