import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import {
  useEmployees, useLocations, useVacations, usePreferences, useSchedules,
  useEmployeeMutations, useVacationMutations, usePreferenceMutations,
} from '../hooks/queries';
import { useCanManage } from '../store/authStore';
import { getErrorMessage } from '../lib/errors';
import { fmtDate, dayLabelFromCode } from '../lib/dates';
import { toISODate, hoursBetween, fmtHours } from '../lib/format';
import { STATUS_COLOR } from '../lib/colors';
import { addDays, startOfWeek } from 'date-fns';
import type { DayOfWeek, Employee, VacationStatus } from '../types';

type Tab = 'employees' | 'vacations' | 'preferences';
const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function Empleats() {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = useCanManage();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'employees');
  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState<VacationStatus | ''>('');

  const employees = useEmployees();
  const locations = useLocations();
  const vacations = useVacations();
  const preferences = usePreferences();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekShifts = useSchedules({ from: toISODate(weekStart), to: toISODate(addDays(weekStart, 6)) });
  const empM = useEmployeeMutations();
  const vacM = useVacationMutations();
  const prefM = usePreferenceMutations();

  const [empModal, setEmpModal] = useState<{ open: boolean; editing?: Employee | null }>({ open: false });
  const [empForm, setEmpForm] = useState({ name: '', email: '', phone: '', position: '', weeklyHours: '' as string | number, locationIds: [] as string[] });
  const [vacModal, setVacModal] = useState(false);
  const [vacForm, setVacForm] = useState({ employeeId: '', fromDate: '', toDate: '', reason: '' });
  const [prefModal, setPrefModal] = useState(false);
  const [prefForm, setPrefForm] = useState({ employeeId: '', dayOfWeek: 'MON' as DayOfWeek, startTime: '09:00', endTime: '17:00', locationId: '', notes: '' });
  const [reviewing, setReviewing] = useState<{ id: string; note: string } | null>(null);
  const [formError, setFormError] = useState('');

  // Keep the tab in the URL (deep links from the dashboard) without fighting user clicks.
  useEffect(() => {
    const fromUrl = params.get('tab') as Tab | null;
    if (fromUrl && ['employees', 'vacations', 'preferences'].includes(fromUrl) && fromUrl !== tab) setTab(fromUrl);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeTab = (next: Tab) => { setTab(next); params.set('tab', next); setParams(params, { replace: true }); };

  const pendingCount = (vacations.data ?? []).filter((v) => v.status === 'PENDING').length;
  const hoursThisWeek = useMemo(() => {
    const m: Record<string, number> = {};
    (weekShifts.data ?? []).forEach((s) => { m[s.employeeId] = (m[s.employeeId] ?? 0) + hoursBetween(s.startTime, s.endTime); });
    return m;
  }, [weekShifts.data]);

  const filteredEmployees = (employees.data ?? []).filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredVacations = (vacations.data ?? []).filter((v) => (!filterEmployee || v.employeeId === filterEmployee) && (!filterStatus || v.status === filterStatus))
    .sort((a, b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1) || a.fromDate.localeCompare(b.fromDate));
  const prefsByEmployee = useMemo(() => {
    const m: Record<string, typeof preferences.data> = {};
    (preferences.data ?? []).filter((p) => !filterEmployee || p.employeeId === filterEmployee).forEach((p) => { (m[p.employeeId] ??= []).push(p); });
    return m;
  }, [preferences.data, filterEmployee]);

  // ── Employee CRUD ───────────────────────────────────────────────────────────
  const openEmp = (editing?: Employee) => {
    setFormError('');
    setEmpForm(editing ? { name: editing.name, email: editing.email ?? '', phone: editing.phone ?? '', position: editing.position ?? '', weeklyHours: editing.weeklyHours ?? '', locationIds: editing.locations?.map((l) => l.locationId) ?? [] } : { name: '', email: '', phone: '', position: '', weeklyHours: '', locationIds: [] });
    setEmpModal({ open: true, editing });
  };
  const saveEmp = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      const p = { name: empForm.name.trim(), email: empForm.email.trim() || null, phone: empForm.phone.trim() || null, position: empForm.position.trim() || null, weeklyHours: empForm.weeklyHours === '' ? null : Number(empForm.weeklyHours), locationIds: empForm.locationIds };
      if (empModal.editing) await empM.update.mutateAsync({ id: empModal.editing.id, p }); else await empM.create.mutateAsync(p);
      toast.success(t(empModal.editing ? 'employees.updated' : 'employees.createdOk'));
      setEmpModal({ open: false });
    } catch (err) { setFormError(getErrorMessage(err)); }
  };
  const deleteEmp = async (emp: Employee) => {
    if (!(await confirm({ title: t('employees.deleteEmployeeTitle', { name: emp.name }), message: t('employees.deleteEmployeeDesc'), danger: true, confirmLabel: t('common.delete') }))) return;
    try { await empM.remove.mutateAsync(emp.id); toast.success(t('employees.deletedOk')); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Vacations ───────────────────────────────────────────────────────────────
  const saveVac = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      await vacM.create.mutateAsync({ ...vacForm, reason: vacForm.reason || null });
      toast.success(t('employees.requestCreated'));
      setVacModal(false); setVacForm({ employeeId: '', fromDate: '', toDate: '', reason: '' });
    } catch (err) { setFormError(getErrorMessage(err)); }
  };
  const setVacStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try { await vacM.setStatus.mutateAsync({ id, status, note: reviewing?.note || undefined }); toast.success(t(status === 'APPROVED' ? 'employees.approved' : 'employees.rejected')); setReviewing(null); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };
  const deleteVac = async (id: string) => {
    if (!(await confirm({ title: t('employees.deleteConfirm'), danger: true, confirmLabel: t('common.delete') }))) return;
    try { await vacM.remove.mutateAsync(id); toast.success(t('employees.requestDeleted')); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  // ── Preferences ─────────────────────────────────────────────────────────────
  const savePref = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    if (prefForm.startTime >= prefForm.endTime) { setFormError(t('schedules.invalidTime')); return; }
    try {
      await prefM.save.mutateAsync({ ...prefForm, locationId: prefForm.locationId || null, notes: prefForm.notes || null });
      toast.success(t('employees.preferenceSaved'));
      setPrefModal(false);
    } catch (err) { setFormError(getErrorMessage(err)); }
  };
  const deletePref = async (id: string) => {
    if (!(await confirm({ title: t('employees.deletePreferenceConfirm'), danger: true, confirmLabel: t('common.delete') }))) return;
    try { await prefM.remove.mutateAsync(id); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (employees.isLoading || locations.isLoading || vacations.isLoading || preferences.isLoading) return <PageSkeleton />;

  const locName = (id?: string | null) => locations.data?.find((l) => l.id === id)?.name ?? '';

  return (
    <div>
      <PageHeader title={t('employees.title')} subtitle={t('employees.subtitle')}
        actions={
          tab === 'employees' ? (canManage && <Button variant="primary" icon="plus" onClick={() => openEmp()}>{t('employees.newEmployee')}</Button>)
          : tab === 'vacations' ? <Button variant="primary" icon="plus" onClick={() => { setFormError(''); setVacModal(true); }}>{t('employees.newRequest')}</Button>
          : <Button variant="primary" icon="plus" onClick={() => { setFormError(''); setPrefModal(true); }}>{t('employees.newPreference')}</Button>
        } />

      <Tabs value={tab} onChange={changeTab} items={[
        { key: 'employees', label: t('employees.tabEmployees'), icon: 'users' },
        { key: 'vacations', label: t('employees.tabVacations'), icon: 'palmtree', count: pendingCount },
        { key: 'preferences', label: t('employees.tabPreferences'), icon: 'heart' },
      ]} />

      {tab === 'employees' && (
        <>
          <div className="toolbar">
            <div className="search"><Icon name="search" /><Input small placeholder={t('employees.search')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <span className="t-sm t-3">{t('employees.count', { n: filteredEmployees.length })}</span>
          </div>
          {filteredEmployees.length === 0 ? <Card><EmptyState icon="users" title={t('employees.noEmployees')} action={canManage && <Button icon="plus" onClick={() => openEmp()}>{t('employees.newEmployee')}</Button>} /></Card> : (
            <div className="grid-auto">
              {filteredEmployees.map((emp) => {
                const approved = (vacations.data ?? []).filter((v) => v.employeeId === emp.id && v.status === 'APPROVED' && v.toDate >= toISODate(new Date()));
                const prefs = (preferences.data ?? []).filter((p) => p.employeeId === emp.id);
                return (
                  <Card key={emp.id} hover className="col gap-3">
                    <div className="row gap-3">
                      <Avatar name={emp.name} id={emp.id} size={44} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="t-strong t-truncate" style={{ fontSize: 15 }}>{emp.name}</div>
                        {emp.position && <div className="t-sm t-2 t-truncate">{emp.position}</div>}
                        {emp.email && <div className="t-sm t-3 row gap-2" style={{ minWidth: 0 }}><Icon name="mail" size={12} style={{ flexShrink: 0 }} /><span className="t-truncate">{emp.email}</span></div>}
                        {emp.phone && <div className="t-sm t-3 row gap-2"><Icon name="phone" size={12} />{emp.phone}</div>}
                      </div>
                      {canManage && (
                        <div className="row" style={{ gap: 2 }}>
                          <Button size="sm" variant="ghost" icon="edit" onClick={() => openEmp(emp)} aria-label={t('common.edit')} />
                          <Button size="sm" variant="ghost" icon="trash" onClick={() => deleteEmp(emp)} aria-label={t('common.delete')} />
                        </div>
                      )}
                    </div>
                    <div className="row-wrap" style={{ gap: 4 }}>
                      {(emp.locations ?? []).map((l) => <span key={l.locationId} className="chip" style={{ height: 22, fontSize: 11 }}><Icon name="mapPin" size={11} />{l.location.name}</span>)}
                      {(emp.locations ?? []).length === 0 && <span className="t-xs t-4">{t('employees.noLocations')}</span>}
                    </div>
                    <div className="col" style={{ gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <div className="row between t-xs t-3">
                        <span><b className="t-2">{fmtHours(hoursThisWeek[emp.id] ?? 0)}</b>{emp.weeklyHours ? ` / ${emp.weeklyHours} h` : ''} {t('employees.thisWeek')}</span>
                        <span>{t('employees.prefsCount', { n: prefs.length })}</span>
                        {approved.length > 0 && <Badge tone="info" dot>{t('employees.upcomingVac')}</Badge>}
                      </div>
                      {emp.weeklyHours ? (
                        <div className="progress"><div style={{ width: `${Math.min(100, ((hoursThisWeek[emp.id] ?? 0) / emp.weeklyHours) * 100)}%`, background: (hoursThisWeek[emp.id] ?? 0) > emp.weeklyHours ? 'var(--danger)' : 'var(--success)' }} /></div>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'vacations' && (
        <>
          <div className="toolbar">
            <Select small value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">{t('employees.allEmployees')}</option>
              {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <div className="pipeline">
              {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                <button key={s} className="pipe" aria-pressed={filterStatus === s} onClick={() => setFilterStatus(s)}>
                  {s ? t(`employees.status.${s}`) : t('employees.allStatuses')}
                  <span className="n">{s ? (vacations.data ?? []).filter((v) => v.status === s).length : vacations.data?.length ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          {filteredVacations.length === 0 ? <Card><EmptyState icon="palmtree" title={t('employees.noRequests')} /></Card> : (
            <div className="col gap-3">
              {filteredVacations.map((v) => {
                const days = Math.round((new Date(v.toDate).getTime() - new Date(v.fromDate).getTime()) / 86400000) + 1;
                return (
                  <Card key={v.id} pad="sm" className="row gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Avatar name={v.employee.name} id={v.employee.id} size={38} />
                    <div className="grow col" style={{ gap: 3, minWidth: 200 }}>
                      <div className="row gap-2"><span className="t-strong">{v.employee.name}</span><Badge tone={STATUS_COLOR[v.status]} dot>{t(`employees.status.${v.status}`)}</Badge></div>
                      <div className="t-sm row gap-2"><Icon name="calendar" size={13} /><span className="t-strong">{fmtDate(v.fromDate, 'EEE d MMM')} → {fmtDate(v.toDate, 'EEE d MMM yyyy')}</span><span className="t-3">· {t('employees.daysN', { n: days })}</span></div>
                      {v.reason && <div className="t-sm t-3">“{v.reason}”</div>}
                      {v.managerNote && <div className="t-sm t-2 row gap-2"><Icon name="user" size={12} />{t('employees.managerNote')}: {v.managerNote}</div>}
                    </div>
                    <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
                      {v.status === 'PENDING' && canManage && (reviewing?.id === v.id ? (
                        <>
                          <Input small placeholder={t('employees.optionalNote')} value={reviewing.note} onChange={(e) => setReviewing({ id: v.id, note: e.target.value })} style={{ width: 200 }} autoFocus />
                          <Button size="sm" variant="success" icon="check" onClick={() => setVacStatus(v.id, 'APPROVED')}>{t('employees.approve')}</Button>
                          <Button size="sm" variant="danger-outline" icon="x" onClick={() => setVacStatus(v.id, 'REJECTED')}>{t('employees.reject')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReviewing(null)}>{t('common.cancel')}</Button>
                        </>
                      ) : <Button size="sm" variant="primary" onClick={() => setReviewing({ id: v.id, note: '' })}>{t('employees.manage')}</Button>)}
                      {v.status !== 'APPROVED' && <Button size="sm" variant="ghost" icon="trash" onClick={() => deleteVac(v.id)} aria-label={t('common.delete')} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'preferences' && (
        <>
          <div className="toolbar">
            <Select small value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">{t('employees.allEmployees')}</option>
              {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <span className="t-sm t-3">{t('employees.prefsHint')}</span>
          </div>
          {Object.keys(prefsByEmployee).length === 0 ? <Card><EmptyState icon="heart" title={t('employees.noPreferences')} /></Card> : (
            <div className="col gap-4">
              {Object.entries(prefsByEmployee).map(([empId, prefs]) => {
                const emp = employees.data?.find((e) => e.id === empId);
                return (
                  <Card key={empId}>
                    <div className="row gap-3 mb-4">
                      <Avatar name={emp?.name ?? '?'} id={empId} size={32} />
                      <span className="t-strong grow">{emp?.name ?? empId}</span>
                      <span className="t-sm t-3">{t('employees.configuredDays', { n: prefs?.length ?? 0 })}</span>
                    </div>
                    <div className="pref-grid">
                      {DAYS.map((day) => {
                        const p = prefs?.find((x) => x.dayOfWeek === day);
                        return (
                          <div key={day} className={`pref-day${p ? ' filled' : ''}`}>
                            <span className="t-caps" style={{ fontSize: 10 }}>{dayLabelFromCode(day)}</span>
                            {p ? (
                              <>
                                <span className="t-sm t-strong t-num">{p.startTime}–{p.endTime}</span>
                                {p.locationId && <span className="t-xs t-3 t-truncate">{locName(p.locationId)}</span>}
                                {p.notes && <span className="t-xs t-3" style={{ fontStyle: 'italic' }}>{p.notes}</span>}
                                <button className="shift-x" style={{ opacity: 1 }} onClick={() => deletePref(p.id)} aria-label={t('common.delete')}><Icon name="x" /></button>
                              </>
                            ) : (
                              <button className="t-xs t-4" style={{ textAlign: 'left', marginTop: 'auto' }} onClick={() => { setPrefForm({ ...prefForm, employeeId: empId, dayOfWeek: day }); setFormError(''); setPrefModal(true); }}>+ {t('employees.add')}</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Employee modal ── */}
      <Modal open={empModal.open} onClose={() => setEmpModal({ open: false })} title={t(empModal.editing ? 'employees.editEmployee' : 'employees.newEmployee')}
        footer={<><Button variant="ghost" onClick={() => setEmpModal({ open: false })}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="emp-form" icon="check" loading={empM.create.isPending || empM.update.isPending}>{t('common.save')}</Button></>}>
        <form id="emp-form" onSubmit={saveEmp} className="col gap-4">
          <Field label={t('employees.name')} required><Input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} required autoFocus /></Field>
          <div className="form-grid">
            <Field label={t('employees.position')}><Input value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })} placeholder={t('employees.positionPlaceholder')} list="position-suggestions" /></Field>
            <Field label={t('employees.weeklyHours')} hint={t('employees.weeklyHoursHint')}><Input type="number" min={0} max={80} value={empForm.weeklyHours} onChange={(e) => setEmpForm({ ...empForm, weeklyHours: e.target.value })} addon="h" /></Field>
            <Field label={t('auth.email')}><Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} /></Field>
            <Field label={t('employees.phone')}><Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} placeholder="+41 79 …" /></Field>
          </div>
          <datalist id="position-suggestions">{['Head barista', 'Barista', 'Roaster', 'Service', 'Kitchen', 'Bartender', 'Manager'].map((x) => <option key={x} value={x} />)}</datalist>
          <Field label={t('employees.locations')} hint={t('employees.locationsHint')}>
            <div className="row-wrap" style={{ gap: 10 }}>
              {locations.data?.map((l) => (
                <label key={l.id} className="checkbox">
                  <input type="checkbox" checked={empForm.locationIds.includes(l.id)} onChange={(e) => setEmpForm({ ...empForm, locationIds: e.target.checked ? [...empForm.locationIds, l.id] : empForm.locationIds.filter((x) => x !== l.id) })} />
                  {l.name}
                </label>
              ))}
            </div>
          </Field>
          {formError && <div className="error-box">{formError}</div>}
        </form>
      </Modal>

      {/* ── Vacation modal ── */}
      <Modal open={vacModal} onClose={() => setVacModal(false)} title={t('employees.newVacationRequest')}
        footer={<><Button variant="ghost" onClick={() => setVacModal(false)}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="vac-form" icon="check" loading={vacM.create.isPending}>{t('employees.create')}</Button></>}>
        <form id="vac-form" onSubmit={saveVac} className="col gap-4">
          <Field label={t('common.employee')} required>
            <Select value={vacForm.employeeId} onChange={(e) => setVacForm({ ...vacForm, employeeId: e.target.value })} required autoFocus>
              <option value="">{t('schedules.selectEmployee')}</option>
              {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label={t('employees.from')} required><Input type="date" value={vacForm.fromDate} onChange={(e) => setVacForm({ ...vacForm, fromDate: e.target.value })} required /></Field>
            <Field label={t('employees.to')} required><Input type="date" value={vacForm.toDate} min={vacForm.fromDate} onChange={(e) => setVacForm({ ...vacForm, toDate: e.target.value })} required /></Field>
          </div>
          <Field label={t('employees.reason')}><Textarea value={vacForm.reason} onChange={(e) => setVacForm({ ...vacForm, reason: e.target.value })} placeholder={t('employees.reasonPlaceholder')} style={{ minHeight: 64 }} /></Field>
          {formError && <div className="error-box">{formError}</div>}
        </form>
      </Modal>

      {/* ── Preference modal ── */}
      <Modal open={prefModal} onClose={() => setPrefModal(false)} title={t('employees.shiftPreference')} description={t('employees.prefsHint')}
        footer={<><Button variant="ghost" onClick={() => setPrefModal(false)}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="pref-form" icon="check" loading={prefM.save.isPending}>{t('common.save')}</Button></>}>
        <form id="pref-form" onSubmit={savePref} className="col gap-4">
          <div className="form-grid">
            <Field label={t('common.employee')} required>
              <Select value={prefForm.employeeId} onChange={(e) => setPrefForm({ ...prefForm, employeeId: e.target.value })} required autoFocus>
                <option value="">{t('schedules.selectEmployee')}</option>
                {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label={t('employees.dayOfWeek')} required>
              <Select value={prefForm.dayOfWeek} onChange={(e) => setPrefForm({ ...prefForm, dayOfWeek: e.target.value as DayOfWeek })}>
                {DAYS.map((d) => <option key={d} value={d}>{dayLabelFromCode(d, true)}</option>)}
              </Select>
            </Field>
            <Field label={t('schedules.startTime')} required><Input type="time" value={prefForm.startTime} onChange={(e) => setPrefForm({ ...prefForm, startTime: e.target.value })} required /></Field>
            <Field label={t('schedules.endTime')} required><Input type="time" value={prefForm.endTime} onChange={(e) => setPrefForm({ ...prefForm, endTime: e.target.value })} required /></Field>
            <Field label={t('employees.preferredLocation')}>
              <Select value={prefForm.locationId} onChange={(e) => setPrefForm({ ...prefForm, locationId: e.target.value })}>
                <option value="">{t('employees.anyLocation')}</option>
                {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label={t('schedules.notes')}><Input value={prefForm.notes} onChange={(e) => setPrefForm({ ...prefForm, notes: e.target.value })} placeholder={t('employees.notesPlaceholder')} /></Field>
          </div>
          {formError && <div className="error-box">{formError}</div>}
        </form>
      </Modal>
    </div>
  );
}
