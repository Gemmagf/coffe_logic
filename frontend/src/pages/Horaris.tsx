import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, startOfWeek, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHead } from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { Select } from '../components/ui/Field';
import { Segmented } from '../components/ui/Tabs';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import ShiftModal, { type ShiftDraft } from '../components/ShiftModal';
import GenerarProposta from './GenerarProposta';
import { useLocations, useEmployees, useSchedules, useScheduleMutations } from '../hooks/queries';
import { useCanManage } from '../store/authStore';
import { getSchedules } from '../api/schedules';
import { toISODate, hoursBetween, fmtHours, fmtNum } from '../lib/format';
import { fmtDate, weekdayShort } from '../lib/dates';
import { colorFor } from '../lib/colors';
import { getErrorMessage } from '../lib/errors';
import type { Schedule } from '../types';

type View = 'week' | 'people';

export default function Horaris() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = useCanManage();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filterLocation, setFilterLocation] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [view, setView] = useState<View>('week');
  const [modal, setModal] = useState<{ open: boolean; editing?: Schedule | null; draft?: ShiftDraft | null }>({ open: false });
  const [wizard, setWizard] = useState(false);
  const [copying, setCopying] = useState(false);

  const from = toISODate(weekStart);
  const to = toISODate(addDays(weekStart, 6));
  const locations = useLocations();
  const employees = useEmployees();
  const schedules = useSchedules({ from, to, ...(filterLocation ? { locationId: filterLocation } : {}) });
  const { create } = useScheduleMutations();

  useEffect(() => {
    if (params.get('new') === '1') {
      setModal({ open: true, draft: { date: toISODate(new Date()) } });
      params.delete('new'); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const all = schedules.data ?? [];
  const visible = filterEmployee ? all.filter((s) => s.employeeId === filterEmployee) : all;
  const forDay = (d: Date) => visible.filter((s) => s.date === toISODate(d)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const totalHours = visible.reduce((s, x) => s + hoursBetween(x.startTime, x.endTime), 0);

  const perEmployee = useMemo(() => {
    const map = new Map<string, { id: string; name: string; hours: number; contract: number | null; shifts: Schedule[] }>();
    visible.forEach((s) => {
      const e = map.get(s.employeeId) ?? { id: s.employeeId, name: s.employee.name, hours: 0, contract: employees.data?.find((x) => x.id === s.employeeId)?.weeklyHours ?? null, shifts: [] };
      e.hours += hoursBetween(s.startTime, s.endTime); e.shifts.push(s); map.set(s.employeeId, e);
    });
    return [...map.values()].sort((a, b) => b.hours - a.hours);
  }, [visible, employees.data]);

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const copyPrevWeek = async () => {
    if (!(await confirm({ title: t('schedules.copyPrevWeek'), message: t('schedules.copyConfirm', { week: `${fmtDate(weekStart, 'd MMM')} – ${fmtDate(addDays(weekStart, 6), 'd MMM')}` }) }))) return;
    setCopying(true);
    try {
      const prev = await getSchedules({ from: toISODate(addDays(weekStart, -7)), to: toISODate(addDays(weekStart, -1)) });
      let ok = 0, skipped = 0;
      for (const s of prev) {
        try {
          await create.mutateAsync({ employeeId: s.employeeId, locationId: s.locationId, date: toISODate(addDays(new Date(s.date + 'T00:00:00'), 7)), startTime: s.startTime, endTime: s.endTime, notes: s.notes ?? null });
          ok++;
        } catch { skipped++; }
      }
      toast[ok ? 'success' : 'warning'](t('schedules.copyResult', { ok, skipped }));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCopying(false); }
  };

  if (locations.isLoading || employees.isLoading) return <PageSkeleton />;

  const emptyWeek = all.length === 0 && !schedules.isFetching;

  return (
    <div>
      <PageHeader title={t('schedules.title')} subtitle={t('schedules.subtitle')}
        actions={canManage && (
          <>
            <Button icon="wand" onClick={() => setWizard(true)}>{t('schedules.generateProposal')}</Button>
            <Button variant="primary" icon="plus" onClick={() => setModal({ open: true, draft: { date: isCurrentWeek ? toISODate(new Date()) : from } })}>{t('schedules.newShift')}</Button>
          </>
        )} />

      <div className="toolbar">
        <div className="row" style={{ gap: 4 }}>
          <Button icon="chevronLeft" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('schedules.prevWeek')} />
          <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} disabled={isCurrentWeek}>{t('schedules.today')}</Button>
          <Button icon="chevronRight" variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('schedules.nextWeek')} />
        </div>
        <span className="t-strong" style={{ fontSize: 15 }}>{fmtDate(weekStart, 'd MMM')} – {fmtDate(addDays(weekStart, 6), 'd MMM yyyy')}</span>
        <span className="badge">{t('schedules.weekNo', { n: fmtDate(weekStart, 'I') })}</span>
        <div className="grow" />
        <Select small value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">{t('schedules.allLocations')}</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <Select small value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
          <option value="">{t('employees.allEmployees')}</option>
          {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
        <Segmented value={view} onChange={setView} items={[{ key: 'week', label: <span className="row gap-2"><Icon name="grid" size={13} />{t('schedules.viewWeek')}</span> }, { key: 'people', label: <span className="row gap-2"><Icon name="users" size={13} />{t('schedules.viewPeople')}</span> }]} />
        {canManage && <Button size="sm" variant="ghost" icon="copy" loading={copying} onClick={copyPrevWeek}>{t('schedules.copyPrevWeek')}</Button>}
      </div>

      <div className="row-wrap mb-4 t-sm t-3">
        <span><b className="t-2">{fmtNum(visible.length)}</b> {t('schedules.shiftsLabel')}</span>
        <span>·</span>
        <span><b className="t-2">{fmtHours(totalHours)}</b> {t('schedules.plannedLabel')}</span>
        <span>·</span>
        <span><b className="t-2">{perEmployee.length}</b> {t('schedules.peopleLabel')}</span>
        {schedules.isFetching && <span className="spinner" style={{ width: 12, height: 12 }} />}
      </div>

      {emptyWeek && (
        <Card className="mb-5">
          <EmptyState icon="calendar" title={t('schedules.emptyWeek')} description={t('schedules.emptyWeekDesc')}
            action={canManage && <div className="row gap-2"><Button icon="copy" onClick={copyPrevWeek} loading={copying}>{t('schedules.copyPrevWeek')}</Button><Button variant="primary" icon="wand" onClick={() => setWizard(true)}>{t('schedules.generateProposal')}</Button></div>} />
        </Card>
      )}

      {view === 'week' ? (
        <div className="week-wrap">
          <div className="week">
            {weekDays.map((day, i) => {
              const items = forDay(day);
              const today = isSameDay(day, new Date());
              const hours = items.reduce((s, x) => s + hoursBetween(x.startTime, x.endTime), 0);
              return (
                <div key={i} className={`day${today ? ' day-today' : ''}`}>
                  <div className="day-head">
                    <span className="day-name">{weekdayShort(i)}</span>
                    <span className="day-num">{fmtDate(day, 'd')}</span>
                  </div>
                  <div className="day-body">
                    {items.map((s) => (
                      <div key={s.id} className="shift" style={{ ['--shift-color' as string]: colorFor(s.employeeId) }} onClick={() => canManage && setModal({ open: true, editing: s })} role={canManage ? 'button' : undefined}>
                        <span className="shift-name">{s.employee.name}</span>
                        <span className="shift-time">{s.startTime}–{s.endTime}</span>
                        {!filterLocation && <span className="shift-loc">{s.location.name}</span>}
                        {s.notes && <span className="shift-loc" title={s.notes}>✎ {s.notes}</span>}
                      </div>
                    ))}
                    {canManage && (
                      <button className="day-add" onClick={() => setModal({ open: true, draft: { date: toISODate(day), locationId: filterLocation || undefined, employeeId: filterEmployee || undefined } })}>
                        <Icon name="plus" />{t('schedules.add')}
                      </button>
                    )}
                  </div>
                  <div className="day-foot"><span>{items.length} {t('schedules.shiftsShort')}</span><span>{fmtHours(hours)}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card pad="none">
          <div className="table-wrap" style={{ border: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('schedules.employee')}</th>
                  {weekDays.map((d, i) => <th key={i} style={{ textAlign: 'center', minWidth: 92 }}>{weekdayShort(i)} <span className="t-4">{fmtDate(d, 'd')}</span></th>)}
                  <th className="num">{t('schedules.hours')}</th>
                </tr>
              </thead>
              <tbody>
                {perEmployee.length === 0 && <tr><td colSpan={9}><EmptyState icon="users" title={t('schedules.emptyWeek')} /></td></tr>}
                {perEmployee.map((e) => (
                  <tr key={e.id}>
                    <td><span className="row gap-3"><Avatar name={e.name} id={e.id} size={26} /><span className="t-strong">{e.name}</span></span></td>
                    {weekDays.map((d, i) => {
                      const items = e.shifts.filter((s) => s.date === toISODate(d));
                      return (
                        <td key={i} style={{ textAlign: 'center' }}>
                          <div className="col" style={{ gap: 3, alignItems: 'center' }}>
                            {items.map((s) => (
                              <button key={s.id} className="chip chip-btn" style={{ background: `color-mix(in srgb, ${colorFor(e.id)} 14%, var(--surface))`, height: 24, fontSize: 11 }} onClick={() => canManage && setModal({ open: true, editing: s })} title={s.location.name}>
                                {s.startTime}–{s.endTime}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                    <td className="num t-strong" style={{ whiteSpace: 'nowrap' }}>{fmtHours(e.hours)}{e.contract ? <span className="t-3" style={{ fontWeight: 500 }}> / {e.contract} h</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {perEmployee.length > 0 && view === 'week' && (
        <Card className="mt-5">
          <CardHead title={t('schedules.hoursByEmployee')} sub={t('schedules.hoursByEmployeeSub')} action={<Button size="sm" variant="ghost" iconRight="arrowRight" onClick={() => navigate('/empleats')}>{t('nav.employees')}</Button>} />
          <div className="grid-auto" style={{ gap: 10 }}>
            {perEmployee.map((e) => (
              <div key={e.id} className="col" style={{ gap: 6, padding: '8px 10px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <div className="row between">
                  <span className="row gap-3 t-truncate"><Avatar name={e.name} id={e.id} size={26} /><span className="t-sm t-strong t-truncate">{e.name}</span></span>
                  <span className="row gap-2" style={{ whiteSpace: 'nowrap' }}><Badge>{e.shifts.length} {t('schedules.shiftsShort')}</Badge><span className="t-sm t-strong t-num">{fmtHours(e.hours)}{e.contract ? <span className="t-3" style={{ fontWeight: 500 }}> / {e.contract} h</span> : null}</span></span>
                </div>
                {e.contract ? (
                  <div className="row gap-2">
                    <div className="progress grow"><div style={{ width: `${Math.min(100, (e.hours / e.contract) * 100)}%`, background: e.hours > e.contract ? 'var(--danger)' : e.hours < e.contract * 0.8 ? 'var(--warning)' : 'var(--success)' }} /></div>
                    <span className={`t-xs ${e.hours > e.contract ? 't-danger' : e.hours < e.contract * 0.8 ? 't-warning' : 't-success'}`} style={{ whiteSpace: 'nowrap' }}>
                      {e.hours > e.contract ? t('schedules.overContract', { h: fmtNum(e.hours - e.contract, 1) }) : e.hours < e.contract ? t('schedules.underContract', { h: fmtNum(e.contract - e.hours, 1) }) : t('schedules.onContract')}
                    </span>
                  </div>
                ) : <span className="t-xs t-4">{t('schedules.noContract')}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <ShiftModal open={modal.open} onClose={() => setModal({ open: false })} employees={employees.data ?? []} locations={locations.data ?? []} editing={modal.editing} draft={modal.draft} />
      {wizard && <GenerarProposta onClose={() => setWizard(false)} onApplied={() => setWizard(false)} />}
    </div>
  );
}
