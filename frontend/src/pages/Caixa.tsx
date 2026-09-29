import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addDays } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHead } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { useLocations, useCashClosings, useCashAnalytics, useClosingMutations } from '../hooks/queries';
import { useAuthStore, useCanManage } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import { fmtCHF, fmtNum, todayISO, toISODate } from '../lib/format';
import { fmtDate, dayLabelFromCode } from '../lib/dates';
import type { CashClosing } from '../types';

/** Expected drawer = opening + cash sales − expenses. Legacy rows without a cash split fall back to total sales. */
export function cashDifference(c: { openingAmount: number | string; closingAmount: number | string; sales: number | string; cashSales?: number | string; expenses: number | string }) {
  const cash = Number(c.cashSales ?? 0) > 0 ? Number(c.cashSales) : Number(c.sales);
  return Number(c.closingAmount) - (Number(c.openingAmount) + cash - Number(c.expenses));
}

const emptyForm = () => ({ locationId: '', date: todayISO(), openingAmount: 200, closingAmount: 0, cardSales: 0, cashSales: 0, expenses: 0, notes: '' });

export default function Caixa() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = useCanManage();
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER');
  const [params, setParams] = useSearchParams();
  const [filterLocation, setFilterLocation] = useState('');
  const [range, setRange] = useState<'14' | '30' | '90' | 'all'>('30');
  const [modal, setModal] = useState<{ open: boolean; editing?: CashClosing | null }>({ open: false });
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const from = range === 'all' ? undefined : toISODate(addDays(new Date(), -(Number(range) - 1)));
  const locations = useLocations();
  const closings = useCashClosings({ ...(filterLocation ? { locationId: filterLocation } : {}), ...(from ? { from } : {}) });
  const analytics = useCashAnalytics(filterLocation || undefined);
  const { create, update, remove } = useClosingMutations();

  useEffect(() => {
    if (params.get('new') === '1') { openNew(); params.delete('new'); setParams(params, { replace: true }); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = closings.data ?? [];
  const totals = useMemo(() => {
    const sales = rows.reduce((s, c) => s + Number(c.sales), 0);
    const card = rows.reduce((s, c) => s + Number(c.cardSales), 0);
    const expenses = rows.reduce((s, c) => s + Number(c.expenses), 0);
    const diff = rows.reduce((s, c) => s + cashDifference(c), 0);
    const days = new Set(rows.map((c) => c.date)).size;
    return { sales, card, expenses, diff, days, avg: days ? sales / days : 0, cardShare: sales ? (card / sales) * 100 : 0 };
  }, [rows]);

  const daily = useMemo(() => {
    const m: Record<string, { date: string; sales: number; expenses: number }> = {};
    rows.forEach((c) => { const d = (m[c.date] ??= { date: c.date, sales: 0, expenses: 0 }); d.sales += Number(c.sales); d.expenses += Number(c.expenses); });
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const openNew = (editing?: CashClosing) => {
    setFormError('');
    setForm(editing ? { locationId: editing.locationId, date: editing.date, openingAmount: Number(editing.openingAmount), closingAmount: Number(editing.closingAmount), cardSales: Number(editing.cardSales), cashSales: Number(editing.cashSales), expenses: Number(editing.expenses), notes: editing.notes ?? '' }
      : { ...emptyForm(), locationId: filterLocation || (locations.data?.length === 1 ? locations.data[0].id : '') });
    setModal({ open: true, editing });
  };

  const sales = form.cardSales + form.cashSales;
  const expected = form.openingAmount + form.cashSales - form.expenses;
  const liveDiff = form.closingAmount - expected;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      const p = { ...form, sales, notes: form.notes || null };
      if (modal.editing) await update.mutateAsync({ id: modal.editing.id, p }); else await create.mutateAsync(p);
      toast.success(t(modal.editing ? 'cash.updated' : 'cash.saved'));
      setModal({ open: false });
    } catch (err) { setFormError(getErrorMessage(err)); }
  };
  const del = async (c: CashClosing) => {
    if (!(await confirm({ title: t('cash.deleteConfirm'), message: `${c.location.name} · ${fmtDate(c.date)}`, danger: true, confirmLabel: t('common.delete') }))) return;
    try { await remove.mutateAsync(c.id); toast.success(t('cash.deleted')); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const num = (key: 'openingAmount' | 'closingAmount' | 'cardSales' | 'cashSales' | 'expenses', label: string, hint?: string) => (
    <Field label={label} hint={hint} required>
      <Input type="number" step="0.01" min="0" addon="CHF" value={form[key]} onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })} onFocus={(e) => e.target.select()} required />
    </Field>
  );

  if (locations.isLoading || closings.isLoading) return <PageSkeleton />;

  const sum = analytics.data?.summary;

  return (
    <div>
      <PageHeader title={t('cash.title')} subtitle={t('cash.subtitle')}
        actions={canManage && <Button variant="primary" icon="plus" onClick={() => openNew()}>{t('cash.newClosing')}</Button>} />

      <div className="toolbar">
        <Select small value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">{t('cash.allLocations')}</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <div className="segmented">
          {(['14', '30', '90', 'all'] as const).map((r) => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r === 'all' ? t('cash.rangeAll') : t('cash.rangeDays', { n: r })}</button>)}
        </div>
        <span className="t-sm t-3">{t('cash.closingsCount', { n: rows.length })}</span>
      </div>

      <div className="grid-kpi mb-5">
        <StatCard label={t('cash.totalSales')} value={fmtCHF(totals.sales, { compact: true })} icon="wallet" sub={t('cash.daysN', { n: totals.days })} />
        <StatCard label={t('cash.dailyAvg')} value={fmtCHF(totals.avg, { compact: true })} icon="trending" />
        <StatCard label={t('cash.cardShare')} value={`${fmtNum(totals.cardShare)}%`} icon="receipt" sub={fmtCHF(totals.card, { compact: true })} />
        <StatCard label={t('cash.expenses')} value={fmtCHF(totals.expenses, { compact: true })} icon="package" />
        <StatCard label={t('cash.cashDifference')} value={<span className={Math.abs(totals.diff) < 0.01 ? '' : totals.diff > 0 ? 't-success' : 't-danger'}>{fmtCHF(totals.diff, { signed: true })}</span>} icon="alert" sub={t('cash.cashDifferenceSub')} />
      </div>

      <div className="grid-main mb-5">
        <Card>
          <CardHead title={t('cash.dailySales')} sub={t('cash.dailySalesSub')} />
          {daily.length < 2 ? <EmptyState icon="wallet" title={t('cash.noHistory')} /> : (
            <>
              <div className="legend mb-3"><span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--viz-1)' }} />{t('cash.sales_col')}</span><span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--viz-2)' }} />{t('cash.expenses_col')}</span></div>
              <LineChart data={daily} xKey="date" height={200} xLabel={(d) => fmtDate(String(d.date), 'd MMM')}
                series={[{ key: 'sales', label: t('cash.sales_col'), color: 'var(--viz-1)', area: true }, { key: 'expenses', label: t('cash.expenses_col'), color: 'var(--viz-2)' }]}
                tooltip={(d) => <><b>{fmtDate(String(d.date), 'EEE d MMM')}</b><br />{t('cash.sales_col')}: {fmtCHF(Number(d.sales))}<br />{t('cash.expenses_col')}: {fmtCHF(Number(d.expenses))}</>} />
            </>
          )}
        </Card>
        <Card>
          <CardHead title={t('cash.avgPerDay')} sub={sum ? t('cash.basedOn', { n: sum.totalClosings }) : undefined} />
          {!analytics.data?.byDayOfWeek.length ? <EmptyState icon="chart" title={t('cash.noHistory')} /> : (
            <>
              <BarChart data={analytics.data.byDayOfWeek} xKey="label" height={180} xLabel={(d) => dayLabelFromCode(String(d.label))}
                series={[{ key: 'avg', label: t('cash.dailyAvg'), color: 'var(--viz-1)' }]} highlightIndex={analytics.data.byDayOfWeek.findIndex((d) => d.day === sum?.bestDay.day)}
                tooltip={(d) => <><b>{dayLabelFromCode(String(d.label), true)}</b><br />{fmtCHF(Number(d.avg))} · {t('cash.closingsCount', { n: Number(d.count) })}</>} />
              {sum && <div className="row-wrap mt-3 t-sm"><Badge tone="success">{t('cash.bestDay')}: {dayLabelFromCode(sum.bestDay.label, true)}</Badge><Badge tone="warning">{t('cash.worstDay')}: {dayLabelFromCode(sum.worstDay.label, true)}</Badge></div>}
            </>
          )}
        </Card>
      </div>

      <Card pad="none">
        <div className="table-wrap" style={{ border: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('cash.date_col')}</th><th>{t('cash.location_col')}</th>
                <th className="num">{t('cash.sales_col')}</th><th className="num hide-mobile">{t('cash.cardSales')}</th><th className="num hide-mobile">{t('cash.cashSales')}</th>
                <th className="num">{t('cash.expenses_col')}</th><th className="num">{t('cash.closing')}</th><th className="num">{t('cash.difference')}</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9}><EmptyState icon="wallet" title={t('cash.noClosings')} action={canManage && <Button icon="plus" onClick={() => openNew()}>{t('cash.newClosing')}</Button>} /></td></tr>}
              {rows.map((c) => {
                const diff = cashDifference(c);
                return (
                  <tr key={c.id}>
                    <td className="t-strong" style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date, 'EEE d MMM')}{c.notes && <Icon name="info" size={13} style={{ display: 'inline', marginLeft: 6, verticalAlign: '-2px', color: 'var(--ink-4)' }} />}</td>
                    <td className="t-truncate" style={{ maxWidth: 200 }}>{c.location.name}</td>
                    <td className="num t-strong">{fmtCHF(c.sales)}</td>
                    <td className="num hide-mobile t-3">{fmtCHF(c.cardSales)}</td>
                    <td className="num hide-mobile t-3">{fmtCHF(c.cashSales)}</td>
                    <td className="num">{fmtCHF(c.expenses)}</td>
                    <td className="num">{fmtCHF(c.closingAmount)}</td>
                    <td className="num"><span className={`badge ${Math.abs(diff) < 0.01 ? 'badge-success' : Math.abs(diff) <= 5 ? 'badge-warning' : 'badge-danger'}`}>{fmtCHF(diff, { signed: true })}</span></td>
                    {canManage && (
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => openNew(c)} aria-label={t('common.edit')} />
                        {isOwner && <Button size="sm" variant="ghost" icon="trash" onClick={() => del(c)} aria-label={t('common.delete')} />}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} size="lg" title={t(modal.editing ? 'cash.editClosing' : 'cash.closingDay')} description={t('cash.formHint')}
        footer={<><Button variant="ghost" onClick={() => setModal({ open: false })}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="closing-form" icon="check" loading={create.isPending || update.isPending}>{t('cash.saveClosing')}</Button></>}>
        <form id="closing-form" onSubmit={submit} className="col gap-4">
          <div className="form-grid">
            <Field label={t('cash.location')} required>
              <Select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required disabled={!!modal.editing} autoFocus>
                <option value="">{t('cash.selectLocation')}</option>
                {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label={t('cash.date')} required><Input type="date" value={form.date} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} required disabled={!!modal.editing} /></Field>
          </div>
          <div className="form-grid">
            {num('cardSales', t('cash.cardSales'))}
            {num('cashSales', t('cash.cashSales'))}
            {num('expenses', t('cash.expenses'), t('cash.expensesHint'))}
            {num('openingAmount', t('cash.openingAmount'))}
            {num('closingAmount', t('cash.closingAmount'), t('cash.closingHint'))}
          </div>
          <div className="row-wrap" style={{ gap: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
            <span className="t-sm">{t('cash.totalSalesField')}: <b>{fmtCHF(sales)}</b></span>
            <span className="t-sm">{t('cash.expectedDrawer')}: <b>{fmtCHF(expected)}</b></span>
            <span className={`t-sm ${Math.abs(liveDiff) < 0.01 ? 't-success' : Math.abs(liveDiff) <= 5 ? 't-warning' : 't-danger'}`}>{t('cash.difference')}: <b>{fmtCHF(liveDiff, { signed: true })}</b></span>
          </div>
          <Field label={t('schedules.notes')}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('cash.notesPlaceholder')} style={{ minHeight: 60 }} /></Field>
          {formError && <div className="error-box">{formError}</div>}
        </form>
      </Modal>
    </div>
  );
}
