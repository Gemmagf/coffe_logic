import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addDays } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card, { CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { PageSkeleton } from '../components/ui/Skeleton';
import LineChart from '../components/charts/LineChart';
import { useAuthStore } from '../store/authStore';
import {
  useLocations, useEmployees, useSchedules, useOrders, useCashClosings, useVacations, useStaffingAnalytics, useOrdersAnalytics,
} from '../hooks/queries';
import { fmtCHF, fmtNum, fmtHours, hoursBetween, todayISO, toISODate } from '../lib/format';
import { fmtDate, relativeDays } from '../lib/dates';
import { colorFor } from '../lib/colors';
import { STATUS_COLOR } from '../lib/colors';

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.goodMorning';
  if (h < 19) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

const DAY_START = 6, DAY_END = 24;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const today = todayISO();
  const from14 = toISODate(addDays(new Date(), -13));

  const locations = useLocations();
  const employees = useEmployees();
  const todayShifts = useSchedules({ from: today, to: today });
  const orders = useOrders();
  const closings = useCashClosings({ from: from14, to: today });
  const pendingVacs = useVacations({ status: 'PENDING' });
  const staffing = useStaffingAnalytics();
  const ordersA = useOrdersAnalytics();

  const loading = locations.isLoading || employees.isLoading || todayShifts.isLoading || orders.isLoading || closings.isLoading;

  // Daily sales series for the last 14 days (all locations aggregated)
  const series = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (let i = 0; i < 14; i++) byDate[toISODate(addDays(new Date(), i - 13))] = 0;
    (closings.data ?? []).forEach((c) => { if (c.date in byDate) byDate[c.date] += Number(c.sales); });
    return Object.entries(byDate).map(([date, sales]) => ({ date, sales }));
  }, [closings.data]);

  const thisWeek = series.slice(7).reduce((s, d) => s + d.sales, 0);
  const lastWeek = series.slice(0, 7).reduce((s, d) => s + d.sales, 0);
  const weekDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const lastClosingDate = (closings.data ?? []).map((c) => c.date).sort().pop();
  const lastDaySales = lastClosingDate ? (closings.data ?? []).filter((c) => c.date === lastClosingDate).reduce((s, c) => s + Number(c.sales), 0) : 0;

  const shifts = todayShifts.data ?? [];
  const hoursToday = shifts.reduce((s, x) => s + hoursBetween(x.startTime, x.endTime), 0);
  const sentOrders = (orders.data ?? []).filter((o) => o.status === 'SENT');
  const draftOrders = (orders.data ?? []).filter((o) => o.status === 'DRAFT');
  const uncovered = (staffing.data?.coverage ?? []).slice(0, 7).filter((d) => !d.covered);
  const overdueSuppliers = (ordersA.data?.supplierFrequency ?? []).filter((s) => s.overdue);
  const pending = pendingVacs.data ?? [];

  const byLocation = useMemo(() => {
    const map = new Map<string, { name: string; shifts: typeof shifts }>();
    (locations.data ?? []).forEach((l) => map.set(l.id, { name: l.name, shifts: [] }));
    shifts.forEach((s) => { map.get(s.locationId)?.shifts.push(s); });
    return [...map.values()].map((v) => ({ ...v, shifts: v.shifts.sort((a, b) => a.startTime.localeCompare(b.startTime)) }));
  }, [locations.data, shifts]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowPct = Math.min(100, Math.max(0, ((nowMin - DAY_START * 60) / ((DAY_END - DAY_START) * 60)) * 100));

  if (loading) return <PageSkeleton />;

  const firstName = user?.email?.split('@')[0] ?? t('common.owner');
  const alerts: { tone: 'warning' | 'danger' | 'info'; icon: 'calendar' | 'truck' | 'palmtree'; text: string; to: string }[] = [];
  uncovered.forEach((d) => alerts.push({ tone: d.shifts === 0 ? 'danger' : 'warning', icon: 'calendar', text: t(d.shifts === 0 ? 'dashboard.alertNoShifts' : 'dashboard.alertPartial', { date: fmtDate(d.date, 'EEE d MMM'), n: d.shifts }), to: '/horaris' }));
  overdueSuppliers.forEach((s) => alerts.push({ tone: 'warning', icon: 'truck', text: t('dashboard.alertSupplier', { name: s.supplierName, days: s.daysSinceLast }), to: '/comandes' }));
  if (pending.length) alerts.push({ tone: 'info', icon: 'palmtree', text: t('dashboard.alertVacations', { n: pending.length }), to: '/empleats' });

  return (
    <div>
      <PageHeader
        title={`${t(greetingKey())}, ${firstName}`}
        subtitle={fmtDate(new Date(), 'EEEE, d MMMM yyyy')}
        actions={
          <>
            <Button icon="plus" onClick={() => navigate('/horaris?new=1')}>{t('dashboard.newShift')}</Button>
            <Button icon="package" onClick={() => navigate('/comandes?new=1')}>{t('dashboard.newOrder')}</Button>
            <Button variant="primary" icon="wallet" onClick={() => navigate('/caixa?new=1')}>{t('dashboard.closing')}</Button>
          </>
        }
      />

      <div className="grid-kpi mb-6">
        <StatCard label={t('dashboard.salesThisWeek')} value={fmtCHF(thisWeek, { compact: true })} icon="trending"
          delta={{ value: weekDelta, label: t('dashboard.vsLastWeek') }} onClick={() => navigate('/caixa')} />
        <StatCard label={t('dashboard.lastDaySales')} value={fmtCHF(lastDaySales, { compact: true })} icon="wallet"
          sub={lastClosingDate ? fmtDate(lastClosingDate, 'EEE d MMM') : t('dashboard.noClosing')} onClick={() => navigate('/caixa')} />
        <StatCard label={t('dashboard.todayShifts')} value={fmtNum(shifts.length)} icon="calendar"
          sub={t('dashboard.hoursPlanned', { h: fmtHours(hoursToday) })} onClick={() => navigate('/horaris')} />
        <StatCard label={t('dashboard.sentOrders')} value={fmtNum(sentOrders.length)} icon="package"
          sub={t('dashboard.draftsCount', { n: draftOrders.length })} onClick={() => navigate('/comandes')} />
        <StatCard label={t('dashboard.team')} value={fmtNum(employees.data?.length ?? 0)} icon="users"
          sub={t('dashboard.locationsCount', { n: locations.data?.length ?? 0 })} onClick={() => navigate('/empleats')} />
      </div>

      <div className="grid-main">
        <div className="col gap-5">
          <Card>
            <CardHead title={t('dashboard.salesTrend')} sub={t('dashboard.salesTrendSub')} action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('/planificacio')}>{t('dashboard.viewForecast')}</Button>} />
            {series.every((d) => d.sales === 0) ? <EmptyState icon="wallet" title={t('dashboard.noClosing')} /> : (
              <LineChart data={series} xKey="date" height={190}
                series={[{ key: 'sales', label: t('dashboard.sales'), color: 'var(--viz-1)', area: true }]}
                xLabel={(d) => fmtDate(String(d.date), 'd MMM')}
                tooltip={(d) => <><b>{fmtDate(String(d.date), 'EEE d MMM')}</b><br />{fmtCHF(Number(d.sales))}</>} />
            )}
          </Card>

          <Card>
            <CardHead title={t('dashboard.todayShiftsTitle')} sub={t('dashboard.timelineSub', { from: `${DAY_START}:00`, to: `${DAY_END}:00` })}
              action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('/horaris')}>{t('nav.schedules')}</Button>} />
            {shifts.length === 0 ? <EmptyState icon="calendar" title={t('dashboard.noShifts')} action={<Button size="sm" icon="plus" onClick={() => navigate('/horaris?new=1')}>{t('dashboard.newShift')}</Button>} /> : (
              <div className="col gap-4">
                {byLocation.filter((l) => l.shifts.length > 0).map((l) => (
                  <div key={l.name}>
                    <div className="row between mb-2">
                      <span className="t-sm t-strong row gap-2"><Icon name="mapPin" size={14} />{l.name}</span>
                      <span className="t-xs t-3">{t('dashboard.shiftsCount', { n: l.shifts.length })}</span>
                    </div>
                    <div className="tl">
                      {l.shifts.map((s) => {
                        const left = Math.max(0, ((toMin(s.startTime) - DAY_START * 60) / ((DAY_END - DAY_START) * 60)) * 100);
                        const right = Math.min(100, ((toMin(s.endTime) - DAY_START * 60) / ((DAY_END - DAY_START) * 60)) * 100);
                        return (
                          <div key={s.id} className="tl-row">
                            <span className="row gap-2 t-sm t-truncate"><Avatar name={s.employee.name} id={s.employee.id} size={22} /><span className="t-truncate hide-mobile">{s.employee.name.split(' ')[0]}</span></span>
                            <div className="tl-bar" title={`${s.employee.name} ${s.startTime}–${s.endTime}`}>
                              <div className="tl-fill" style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%`, ['--shift-color' as string]: colorFor(s.employee.id) }} />
                              <span style={{ position: 'absolute', left: `calc(${left}% + 6px)`, top: 3, fontSize: 10.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{s.startTime}–{s.endTime}</span>
                              {nowPct > 0 && nowPct < 100 && <div className="tl-now" style={{ left: `${nowPct}%` }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col gap-5">
          <Card>
            <CardHead title={t('dashboard.attention')} sub={alerts.length ? t('dashboard.attentionSub', { n: alerts.length }) : t('dashboard.allGood')} />
            {alerts.length === 0 ? (
              <div className="notice notice-success"><Icon name="checkCircle" /><span>{t('dashboard.allGoodDesc')}</span></div>
            ) : (
              <div className="col gap-2">
                {alerts.slice(0, 6).map((a, i) => (
                  <button key={i} className={`notice notice-${a.tone}`} style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate(a.to)}>
                    <Icon name={a.icon} /><span className="grow">{a.text}</span><Icon name="chevronRight" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHead title={t('dashboard.recentOrders')} action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('/comandes')}>{t('nav.orders')}</Button>} />
            {(orders.data ?? []).length === 0 ? <EmptyState icon="package" title={t('dashboard.noOrders')} /> : (
              <div className="list">
                {(orders.data ?? []).slice(0, 5).map((o) => (
                  <div key={o.id} className="list-item">
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="t-sm t-strong t-truncate">{o.supplier.name}</span>
                      <span className="t-xs t-3 t-truncate">{o.location.name} · {relativeDays(Math.round((Date.now() - new Date(o.createdAt).getTime()) / 86400000))}</span>
                    </div>
                    <Badge tone={STATUS_COLOR[o.status]}>{t(`orders.status.${o.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHead title={t('dashboard.upcomingVacations')} />
            {pending.length === 0 ? <p className="t-sm t-3">{t('dashboard.noPendingVacations')}</p> : (
              <div className="list">
                {pending.slice(0, 4).map((v) => (
                  <div key={v.id} className="list-item">
                    <div className="row gap-3" style={{ minWidth: 0 }}>
                      <Avatar name={v.employee.name} id={v.employee.id} size={26} />
                      <div className="col" style={{ gap: 1, minWidth: 0 }}>
                        <span className="t-sm t-strong t-truncate">{v.employee.name}</span>
                        <span className="t-xs t-3">{fmtDate(v.fromDate, 'd MMM')} → {fmtDate(v.toDate, 'd MMM')}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/empleats?tab=vacations')}>{t('employees.manage')}</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
