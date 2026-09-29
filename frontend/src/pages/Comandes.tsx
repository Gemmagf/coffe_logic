import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHead } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import { useLocations, useSuppliers, useOrders, useOrdersAnalytics, useOrderMutations } from '../hooks/queries';
import { useCanManage } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import { fmtCHF, fmtNum } from '../lib/format';
import { fmtDate, relativeDays } from '../lib/dates';
import { STATUS_COLOR } from '../lib/colors';
import type { Order, OrderItem, OrderStatus } from '../types';

const STATUSES: OrderStatus[] = ['DRAFT', 'SENT', 'RECEIVED'];
const UNITS = ['kg', 'g', 'L', 'u', 'pack', 'box'];
const emptyItem = (): OrderItem => ({ productName: '', quantity: 1, unit: 'kg', unitPrice: 0 });
const orderTotal = (items: OrderItem[]) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

export default function Comandes() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = useCanManage();
  const [params, setParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('');
  const [filterLocation, setFilterLocation] = useState('');
  const [search, setSearch] = useState('');
  const [showRecs, setShowRecs] = useState(true);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [form, setForm] = useState({ supplierId: '', locationId: '', notes: '', deliveryAt: '', items: [emptyItem()] });
  const [quick, setQuick] = useState<{ supplierId: string; locationId: string } | null>(null);
  const [formError, setFormError] = useState('');

  const locations = useLocations();
  const suppliers = useSuppliers();
  const orders = useOrders({ ...(filterLocation ? { locationId: filterLocation } : {}) });
  const analytics = useOrdersAnalytics();
  const { create, setStatus, remove } = useOrderMutations();

  useEffect(() => {
    if (params.get('new') === '1') { openNew(); params.delete('new'); setParams(params, { replace: true }); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = orders.data ?? [];
  const counts = useMemo(() => ({ '': all.length, DRAFT: all.filter((o) => o.status === 'DRAFT').length, SENT: all.filter((o) => o.status === 'SENT').length, RECEIVED: all.filter((o) => o.status === 'RECEIVED').length }), [all]);
  const visible = all.filter((o) => (!filterStatus || o.status === filterStatus) && (!search || o.supplier.name.toLowerCase().includes(search.toLowerCase()) || o.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()))));
  const sentTotal = all.filter((o) => o.status === 'SENT').reduce((s, o) => s + orderTotal(o.items), 0);

  const suggestions = analytics.data?.suggestions ?? [];
  const suggestionsBySupplier = useMemo(() => {
    const m = new Map<string, typeof suggestions>();
    suggestions.forEach((s) => { m.set(s.supplierId, [...(m.get(s.supplierId) ?? []), s]); });
    return [...m.entries()];
  }, [suggestions]);

  const openNew = (preset?: Partial<typeof form>) => {
    setFormError('');
    setForm({ supplierId: '', locationId: locations.data?.length === 1 ? locations.data[0].id : '', notes: '', deliveryAt: '', items: [emptyItem()], ...preset });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const items = form.items.filter((i) => i.productName.trim());
    if (!items.length) { setFormError(t('orders.needItems')); return; }
    try {
      await create.mutateAsync({ supplierId: form.supplierId, locationId: form.locationId, items: items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })), notes: form.notes || null, deliveryAt: form.deliveryAt ? new Date(form.deliveryAt + 'T12:00:00').toISOString() : null });
      toast.success(t('orders.created'));
      setModal(false);
    } catch (err) { setFormError(getErrorMessage(err)); }
  };

  const changeStatus = async (o: Order, status: OrderStatus) => {
    try { await setStatus.mutateAsync({ id: o.id, status }); toast.success(t(`orders.statusChanged.${status}`)); setDetail(null); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };
  const del = async (o: Order) => {
    if (!(await confirm({ title: t('orders.deleteConfirm'), message: `${o.supplier.name} · ${o.location.name}`, danger: true, confirmLabel: t('common.delete') }))) return;
    try { await remove.mutateAsync(o.id); toast.success(t('orders.deleted')); setDetail(null); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const quickOrder = async () => {
    if (!quick) return;
    const items = suggestions.filter((s) => s.supplierId === quick.supplierId);
    try {
      await create.mutateAsync({ supplierId: quick.supplierId, locationId: quick.locationId, items: items.map((s) => ({ productName: s.productName, quantity: s.suggestedQty, unit: s.unit, unitPrice: 0 })), notes: t('orders.autoNote', { date: fmtDate(new Date()) }), deliveryAt: null });
      toast.success(t('orders.orderCreatedFor', { name: items[0]?.supplierName ?? '' }));
      setQuick(null);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const setItem = (idx: number, patch: Partial<OrderItem>) => setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });

  if (locations.isLoading || suppliers.isLoading || orders.isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')}
        actions={canManage && <Button variant="primary" icon="plus" onClick={() => openNew()}>{t('orders.newOrder')}</Button>} />

      <div className="grid-kpi mb-5">
        <div className="card stat"><span className="stat-label">{t('orders.status.DRAFT')}</span><span className="stat-value">{fmtNum(counts.DRAFT)}</span></div>
        <div className="card stat"><span className="stat-label">{t('orders.status.SENT')}</span><span className="stat-value">{fmtNum(counts.SENT)}</span><span className="t-sm t-3">{t('orders.inTransitValue', { v: fmtCHF(sentTotal, { compact: true }) })}</span></div>
        <div className="card stat"><span className="stat-label">{t('orders.status.RECEIVED')}</span><span className="stat-value">{fmtNum(counts.RECEIVED)}</span></div>
        <div className="card stat"><span className="stat-label">{t('orders.overdueSuppliers')}</span><span className={`stat-value${suggestionsBySupplier.length ? ' t-warning' : ''}`}>{fmtNum(suggestionsBySupplier.length)}</span></div>
      </div>

      {suggestionsBySupplier.length > 0 && canManage && (
        <Card warm className="mb-5">
          <CardHead title={<span className="row gap-2"><Icon name="sparkles" size={16} />{t('orders.recommendedOrders')}</span>} sub={t('orders.overdueSubtitle')}
            action={<Button size="sm" variant="ghost" icon={showRecs ? 'chevronDown' : 'chevronRight'} onClick={() => setShowRecs(!showRecs)}>{showRecs ? t('common.hide') : t('common.show')}</Button>} />
          {showRecs && (
            <div className="col gap-3">
              {suggestionsBySupplier.map(([supId, sugs]) => {
                const freq = analytics.data?.supplierFrequency.find((f) => f.supplierId === supId);
                const isQuick = quick?.supplierId === supId;
                return (
                  <div key={supId} className="card card-pad-sm col gap-3">
                    <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div className="t-strong row gap-2"><Icon name="truck" size={15} />{sugs[0].supplierName}</div>
                        {freq && <div className="t-xs t-warning mt-2">{t('orders.daysAgo', { n: freq.daysSinceLast, avg: freq.avgIntervalDays })}</div>}
                      </div>
                      {isQuick ? (
                        <div className="row-wrap">
                          <Select small value={quick.locationId} onChange={(e) => setQuick({ ...quick, locationId: e.target.value })}>
                            <option value="">{t('orders.selectLocation')}</option>
                            {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </Select>
                          <Button size="sm" variant="primary" icon="check" disabled={!quick.locationId} loading={create.isPending} onClick={quickOrder}>{t('orders.confirm')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setQuick(null)}>{t('common.cancel')}</Button>
                        </div>
                      ) : (
                        <div className="row gap-2">
                          <Button size="sm" variant="secondary" icon="edit" onClick={() => openNew({ supplierId: supId, items: sugs.map((s) => ({ productName: s.productName, quantity: s.suggestedQty, unit: s.unit, unitPrice: 0 })) })}>{t('orders.customize')}</Button>
                          <Button size="sm" variant="primary" icon="sparkles" onClick={() => setQuick({ supplierId: supId, locationId: locations.data?.length === 1 ? locations.data[0].id : '' })}>{t('orders.quickOrder')}</Button>
                        </div>
                      )}
                    </div>
                    <div className="row-wrap" style={{ gap: 5 }}>{sugs.map((s, i) => <span key={i} className="chip" style={{ height: 24, fontSize: 11.5 }}>{s.productName} · <b>{s.suggestedQty} {s.unit}</b></span>)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="toolbar">
        <div className="pipeline">
          {(['', ...STATUSES] as const).map((s) => (
            <button key={s} className="pipe" aria-pressed={filterStatus === s} onClick={() => setFilterStatus(s)}>
              {s ? t(`orders.status.${s}`) : t('orders.allStatuses')}<span className="n">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="grow" />
        <Select small value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">{t('orders.allLocations')}</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <div className="search"><Icon name="search" /><Input small placeholder={t('orders.search')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>

      {visible.length === 0 ? <Card><EmptyState icon="package" title={t('orders.noOrders')} action={canManage && <Button icon="plus" onClick={() => openNew()}>{t('orders.newOrder')}</Button>} /></Card> : (
        <div className="grid-auto-lg">
          {visible.map((o) => (
            <Card key={o.id} hover className="col gap-3" onClick={() => setDetail(o)} style={{ cursor: 'pointer' }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="t-strong t-truncate" style={{ fontSize: 15 }}>{o.supplier.name}</div>
                  <div className="t-sm t-3 t-truncate row gap-2"><Icon name="mapPin" size={12} />{o.location.name}</div>
                </div>
                <Badge tone={STATUS_COLOR[o.status]} dot>{t(`orders.status.${o.status}`)}</Badge>
              </div>
              <div className="row-wrap" style={{ gap: 5 }}>
                {o.items.slice(0, 4).map((it, i) => <span key={i} className="chip" style={{ height: 24, fontSize: 11.5 }}>{it.productName} · {it.quantity} {it.unit}</span>)}
                {o.items.length > 4 && <span className="chip" style={{ height: 24, fontSize: 11.5 }}>+{o.items.length - 4}</span>}
              </div>
              <div className="row between t-sm" style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <span className="t-3">{fmtDate(o.createdAt)}{o.deliveryAt && <> · <Icon name="truck" size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {fmtDate(o.deliveryAt)}</>}</span>
                <span className="t-strong t-num">{fmtCHF(orderTotal(o.items))}</span>
              </div>
              {canManage && o.status !== 'RECEIVED' && (
                <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
                  {o.status === 'DRAFT' && <Button size="sm" variant="primary" icon="send" onClick={() => changeStatus(o, 'SENT')}>{t('orders.send')}</Button>}
                  {o.status === 'SENT' && <Button size="sm" variant="success" icon="check" onClick={() => changeStatus(o, 'RECEIVED')}>{t('orders.markReceived')}</Button>}
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => del(o)} aria-label={t('common.delete')} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.supplier.name ?? ''} description={detail ? `${detail.location.name} · ${fmtDate(detail.createdAt, 'd MMM yyyy')} · ${relativeDays(Math.round((Date.now() - new Date(detail.createdAt).getTime()) / 86400000))}` : ''}
        footer={detail && canManage && (
          <>
            {detail.status !== 'RECEIVED' && <Button variant="danger-outline" icon="trash" onClick={() => del(detail)} style={{ marginRight: 'auto' }}>{t('common.delete')}</Button>}
            {detail.status === 'DRAFT' && <Button variant="primary" icon="send" onClick={() => changeStatus(detail, 'SENT')}>{t('orders.send')}</Button>}
            {detail.status === 'SENT' && <Button variant="success" icon="check" onClick={() => changeStatus(detail, 'RECEIVED')}>{t('orders.markReceived')}</Button>}
          </>
        )}>
        {detail && (
          <div className="col gap-4">
            <div className="row gap-2"><Badge tone={STATUS_COLOR[detail.status]} dot>{t(`orders.status.${detail.status}`)}</Badge>{detail.deliveryAt && <Badge><Icon name="truck" size={12} />{t('orders.deliveryDate')}: {fmtDate(detail.deliveryAt)}</Badge>}</div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>{t('orders.productName')}</th><th className="num">{t('orders.qty')}</th><th className="num">{t('orders.pricePerUnit')}</th><th className="num">{t('orders.total')}</th></tr></thead>
                <tbody>
                  {detail.items.map((it, i) => <tr key={i}><td>{it.productName}</td><td className="num">{it.quantity} {it.unit}</td><td className="num">{fmtCHF(it.unitPrice)}</td><td className="num t-strong">{fmtCHF(it.quantity * it.unitPrice)}</td></tr>)}
                  <tr><td colSpan={3} className="t-strong" style={{ textAlign: 'right' }}>{t('orders.total')}</td><td className="num t-strong" style={{ fontSize: 15 }}>{fmtCHF(orderTotal(detail.items))}</td></tr>
                </tbody>
              </table>
            </div>
            {detail.notes && <div className="notice notice-info"><Icon name="info" /><span>{detail.notes}</span></div>}
          </div>
        )}
      </Modal>

      {/* ── New order modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} size="lg" title={t('orders.newOrderForm')}
        footer={<><span className="t-sm t-3" style={{ marginRight: 'auto' }}>{t('orders.total')}: <b className="t-2" style={{ fontSize: 15 }}>{fmtCHF(orderTotal(form.items))}</b></span><Button variant="ghost" onClick={() => setModal(false)}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="order-form" icon="check" loading={create.isPending}>{t('orders.createOrder')}</Button></>}>
        <form id="order-form" onSubmit={submit} className="col gap-4">
          <div className="form-grid">
            <Field label={t('orders.supplier')} required>
              <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required autoFocus>
                <option value="">{t('orders.selectSupplier')}</option>
                {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={t('schedules.location')} required>
              <Select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required>
                <option value="">{t('orders.selectLocation')}</option>
                {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label={t('orders.deliveryDate')}><Input type="date" value={form.deliveryAt} onChange={(e) => setForm({ ...form, deliveryAt: e.target.value })} /></Field>
          </div>
          <div>
            <div className="row between mb-2"><span className="label">{t('orders.products')}</span><Button size="sm" variant="ghost" icon="plus" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>{t('orders.addProduct')}</Button></div>
            <div className="col gap-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  <Input small placeholder={t('orders.productName')} value={it.productName} onChange={(e) => setItem(idx, { productName: e.target.value })} style={{ flex: '2 1 160px' }} list="product-suggestions" />
                  <Input small type="number" min="0.01" step="0.01" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} style={{ width: 80 }} aria-label={t('orders.qty')} />
                  <Select small value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} style={{ width: 84 }}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select>
                  <Input small type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })} style={{ width: 100 }} addon="CHF" aria-label={t('orders.pricePerUnit')} />
                  <span className="t-sm t-num t-3" style={{ width: 90, textAlign: 'right' }}>{fmtCHF(it.quantity * it.unitPrice)}</span>
                  <Button size="sm" variant="ghost" icon="x" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} aria-label={t('common.delete')} />
                </div>
              ))}
            </div>
            <datalist id="product-suggestions">{analytics.data?.topProducts.map((p) => <option key={p.name} value={p.name} />)}</datalist>
          </div>
          <Field label={t('schedules.notes')}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('orders.notesPlaceholder')} style={{ minHeight: 60 }} /></Field>
          {formError && <div className="error-box">{formError}</div>}
        </form>
      </Modal>
    </div>
  );
}
