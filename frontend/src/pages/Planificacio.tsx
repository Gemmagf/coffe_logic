import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import StatCard from '../components/ui/StatCard';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import { Select } from '../components/ui/Field';
import { PageSkeleton } from '../components/ui/Skeleton';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import HBarList from '../components/charts/HBarList';
import { useCashAnalytics, useOrdersAnalytics, useStaffingAnalytics, useLocations } from '../hooks/queries';
import { fmtCHF, fmtNum } from '../lib/format';
import { fmtDate, dayLabelFromCode } from '../lib/dates';

type Tab = 'cash' | 'orders' | 'staffing';

export default function Planificacio() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('cash');
  const [loc, setLoc] = useState('');
  const locations = useLocations();
  const cash = useCashAnalytics(loc || undefined);
  const orders = useOrdersAnalytics();
  const staffing = useStaffingAnalytics();

  if (cash.isLoading || orders.isLoading || staffing.isLoading) return <PageSkeleton />;

  const sum = cash.data?.summary;
  const forecastTotal = (cash.data?.forecast ?? []).reduce((s, f) => s + f.predicted, 0);
  // Weekly chart: hide the current, still-partial week so the line does not fake a drop.
  const trendAll = cash.data?.trend ?? [];
  const trend = trendAll.length > 1 && trendAll[trendAll.length - 1].days < 7 ? trendAll.slice(0, -1) : trendAll;
  const fullWeeks = trend.filter((w) => w.days >= 7);
  const lastTwo = fullWeeks.slice(-2);
  const lastWeek = lastTwo[lastTwo.length - 1];
  const trendDelta = lastTwo.length === 2 && lastTwo[0].sales > 0 ? Math.round(((lastTwo[1].sales - lastTwo[0].sales) / lastTwo[0].sales) * 100) : null;
  const cov = staffing.data;

  return (
    <div>
      <PageHeader title={t('planning.title')} subtitle={t('planning.subtitle')} />
      <Tabs value={tab} onChange={setTab} items={[
        { key: 'cash', label: t('planning.tabCash'), icon: 'wallet' },
        { key: 'orders', label: t('planning.tabOrders'), icon: 'package', count: orders.data?.suggestions.length ? new Set(orders.data.suggestions.map((s) => s.supplierId)).size : 0 },
        { key: 'staffing', label: t('planning.tabShifts'), icon: 'calendar', count: cov?.uncoveredDays },
      ]} />

      {tab === 'cash' && (
        <>
          <div className="toolbar">
            <Select small value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">{t('cash.allLocations')}</option>
              {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            {sum && <span className="t-sm t-3">{t('cash.basedOn', { n: sum.totalClosings })}</span>}
          </div>
          {!sum ? <Card><EmptyState icon="wallet" title={t('planning.noData')} action={<Button icon="plus" onClick={() => navigate('/caixa?new=1')}>{t('cash.newClosing')}</Button>} /></Card> : (
            <div className="col gap-5">
              <div className="grid-kpi">
                <StatCard label={t('planning.forecastWeek')} value={fmtCHF(forecastTotal, { compact: true })} icon="sparkles" sub={t('planning.forecastBasis')} hero />
                <StatCard label={t('planning.weekSales')} value={fmtCHF(lastWeek?.sales ?? 0, { compact: true })} icon="trending" sub={lastWeek ? t('planning.weekLabel', { w: lastWeek.week }) : t('planning.noFullWeek')} delta={trendDelta === null ? undefined : { value: trendDelta, label: t('dashboard.vsLastWeek') }} />
                <StatCard label={t('planning.dailyAvg')} value={fmtCHF(sum.avgDailySales, { compact: true })} icon="wallet" />
                <StatCard label={t('planning.bestDay')} value={dayLabelFromCode(sum.bestDay.label, true)} icon="star" sub={t('cash.avgOf', { n: fmtCHF(sum.bestDay.avg, { compact: true }) })} />
                <StatCard label={t('planning.worstDay')} value={dayLabelFromCode(sum.worstDay.label, true)} icon="arrowDown" sub={t('cash.avgOf', { n: fmtCHF(sum.worstDay.avg, { compact: true }) })} />
              </div>
              <div className="grid-auto-lg">
                <Card>
                  <CardHead title={t('planning.weeklyTrend')} sub={t('planning.fullWeeksOnly')} />
                  {trend.length < 2 ? <EmptyState icon="chart" title={t('planning.noSalesData')} /> : (
                    <>
                      <div className="legend mb-3"><span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--viz-1)' }} />{t('planning.totalSales')}</span><span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--viz-3)' }} />{t('planning.net')}</span></div>
                      <LineChart data={trend} xKey="week" height={200} xLabel={(d) => String(d.week).replace(/^\d{4}-/, '')}
                        series={[{ key: 'sales', label: t('planning.totalSales'), color: 'var(--viz-1)', area: true }, { key: 'net', label: t('planning.net'), color: 'var(--viz-3)' }]}
                        tooltip={(d) => <><b>{String(d.week)}</b> · {t('cash.daysN', { n: Number(d.days) })}<br />{t('planning.totalSales')}: {fmtCHF(Number(d.sales))}<br />{t('planning.net')}: {fmtCHF(Number(d.net))}</>} />
                    </>
                  )}
                </Card>
                <Card>
                  <CardHead title={t('planning.forecastWeekTitle')} sub={t('planning.forecastBasis')} />
                  {cash.data!.forecast.every((f) => f.predicted === 0) ? <EmptyState icon="chart" title={t('planning.noSalesData')} /> : (
                    <>
                      <BarChart data={cash.data!.forecast} xKey="date" height={170} xLabel={(d) => `${dayLabelFromCode(String(d.label))} ${fmtDate(String(d.date), 'd')}`}
                        series={[{ key: 'predicted', label: t('planning.forecast'), color: 'var(--viz-4)' }]}
                        tooltip={(d) => <><b>{fmtDate(String(d.date), 'EEEE d MMM')}</b><br />{fmtCHF(Number(d.predicted))}</>} />
                      <div className="list mt-3">
                        {cash.data!.forecast.map((f) => <div key={f.date} className="list-item" style={{ padding: '5px 0' }}><span className="t-sm">{fmtDate(f.date, 'EEEE d MMM')}</span><span className="t-sm t-strong t-num">{fmtCHF(f.predicted)}</span></div>)}
                      </div>
                    </>
                  )}
                </Card>
                <Card>
                  <CardHead title={t('planning.salesByDay')} />
                  <BarChart data={cash.data!.byDayOfWeek} xKey="label" height={200} xLabel={(d) => dayLabelFromCode(String(d.label))}
                    series={[{ key: 'avg', label: t('cash.dailyAvg'), color: 'var(--viz-1)' }]} highlightIndex={cash.data!.byDayOfWeek.findIndex((d) => d.day === sum.bestDay.day)}
                    tooltip={(d) => <><b>{dayLabelFromCode(String(d.label), true)}</b><br />{fmtCHF(Number(d.avg))} · {t('cash.closingsCount', { n: Number(d.count) })}</>} />
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        !orders.data || orders.data.topProducts.length === 0 ? <Card><EmptyState icon="package" title={t('planning.noOrderHistory')} /></Card> : (
          <div className="col gap-5">
            <Card warm>
              <CardHead title={<span className="row gap-2"><Icon name="sparkles" size={16} />{t('planning.pendingOrders')}</span>} sub={orders.data.suggestions.length ? t('orders.overdueSubtitle') : t('planning.allUpToDate')}
                action={orders.data.suggestions.length > 0 && <Button size="sm" variant="primary" iconRight="arrowRight" onClick={() => navigate('/comandes')}>{t('planning.goToOrders')}</Button>} />
              {orders.data.suggestions.length > 0 && (
                <div className="row-wrap">
                  {[...new Set(orders.data.suggestions.map((s) => s.supplierId))].map((id) => {
                    const f = orders.data!.supplierFrequency.find((x) => x.supplierId === id);
                    return <Badge key={id} tone="warning" dot>{f?.supplierName} · {t('orders.daysAgo', { n: f?.daysSinceLast, avg: f?.avgIntervalDays })}</Badge>;
                  })}
                </div>
              )}
            </Card>
            <div className="grid-auto-lg">
              <Card>
                <CardHead title={t('planning.top10Products')} sub={t('planning.topProductsSub')} />
                <HBarList rows={orders.data.topProducts.map((p) => ({ label: p.name, sub: p.supplierName, value: p.count, display: <>{p.count}× · Ø {p.avgQty} {p.lastUnit}</> }))} />
              </Card>
              <Card pad="none">
                <div className="card-pad" style={{ paddingBottom: 0 }}><CardHead title={t('planning.supplierFrequency')} /></div>
                <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
                  <table className="table">
                    <thead><tr><th>{t('orders.supplier')}</th><th className="num">{t('planning.orders_count')}</th><th className="num">{t('planning.interval')}</th><th className="num">{t('planning.lastOrder')}</th><th /></tr></thead>
                    <tbody>
                      {orders.data.supplierFrequency.map((s) => (
                        <tr key={s.supplierId}>
                          <td className="t-strong">{s.supplierName}</td>
                          <td className="num">{s.totalOrders}</td>
                          <td className="num">{s.avgIntervalDays > 0 ? t('planning.everyNDays', { n: s.avgIntervalDays }) : '—'}</td>
                          <td className="num">{t('planning.daysAgoShort', { n: s.daysSinceLast })}</td>
                          <td className="num">{s.overdue ? <Badge tone="warning" dot>{t('planning.overdue')}</Badge> : <Badge tone="success" dot>{t('planning.ok')}</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )
      )}

      {tab === 'staffing' && cov && (
        <div className="col gap-5">
          <div className="grid-kpi">
            <StatCard label={t('planning.coveredDays')} value={fmtNum(cov.coveredDays)} icon="checkCircle" sub={t('planning.ofNext14')} />
            <StatCard label={t('planning.uncoveredDays')} value={<span className={cov.uncoveredDays ? 't-danger' : 't-success'}>{fmtNum(cov.uncoveredDays)}</span>} icon="alert" />
            <StatCard label={t('planning.activeLocations')} value={fmtNum(cov.totalLocations)} icon="mapPin" />
            <StatCard label={t('planning.employees')} value={fmtNum(cov.totalEmployees)} icon="users" />
          </div>
          <Card>
            <CardHead title={t('planning.shiftCoverage')} sub={t('planning.coverageDesc', { n: cov.totalLocations })} action={<Button size="sm" iconRight="arrowRight" onClick={() => navigate('/horaris')}>{t('nav.schedules')}</Button>} />
            <div className="cov">
              {cov.coverage.map((d) => {
                const state = d.covered ? 'ok' : d.shifts > 0 ? 'partial' : 'none';
                return (
                  <div key={d.date} className={`cov-cell cov-${state}`} title={d.employees.join(', ')}>
                    <span className="cov-day">{dayLabelFromCode(d.dayLabel)}</span>
                    <span className="cov-date">{fmtDate(d.date, 'd MMM')}</span>
                    <span className={`cov-n ${state === 'ok' ? 't-success' : state === 'partial' ? 't-warning' : 't-danger'}`}>{d.shifts === 0 ? '—' : d.shifts}</span>
                    <span className="t-xs t-3">{d.shifts === 0 ? t('planning.noShifts') : t('planning.shiftsN', { n: d.shifts })}</span>
                    {d.employees.length > 0 && <span className="t-xs t-3 t-truncate" style={{ maxWidth: '100%' }}>{d.employees.slice(0, 2).map((e) => e.split(' ')[0]).join(', ')}{d.employees.length > 2 ? ` +${d.employees.length - 2}` : ''}</span>}
                  </div>
                );
              })}
            </div>
            <div className="legend mt-4">
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--success)' }} />{t('planning.legend_covered')}</span>
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--warning)' }} />{t('planning.legend_partial')}</span>
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--danger)' }} />{t('planning.legend_uncovered')}</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
