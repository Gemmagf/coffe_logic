import { useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, isWithinInterval, startOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import Avatar from '../components/ui/Avatar';
import { Field, Input } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { useEmployees, useLocations, useVacations, usePreferences, useScheduleMutations } from '../hooks/queries';
import { toISODate, parseLocalDate, fmtNum } from '../lib/format';
import { fmtDate, dayLabelFromCode } from '../lib/dates';
import { colorFor } from '../lib/colors';
import type { DayOfWeek } from '../types';

interface ShiftSlot { label: string; startTime: string; endTime: string }
interface LocationConfig { locationId: string; slots: ShiftSlot[]; staffPerSlot: number }
interface ProposedShift { employeeId: string; employeeName: string; locationId: string; locationName: string; date: string; startTime: string; endTime: string; warning?: boolean }

const DAY_CODE: Record<number, DayOfWeek> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT', 0: 'SUN' };
const PRESETS = [
  { key: 'morning', startTime: '07:00', endTime: '15:00' },
  { key: 'midday', startTime: '11:00', endTime: '19:00' },
  { key: 'evening', startTime: '15:00', endTime: '23:00' },
];
const UNASSIGNED = '__unassigned__';

interface Props { onClose: () => void; onApplied: () => void }

export default function GenerarProposta({ onClose, onApplied }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const employees = useEmployees();
  const locations = useLocations();
  const vacations = useVacations({ status: 'APPROVED' });
  const preferences = usePreferences();
  const { create } = useScheduleMutations();

  const nextMonday = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
  const [fromDate, setFromDate] = useState(toISODate(nextMonday));
  const [toDate, setToDate] = useState(toISODate(addDays(nextMonday, 6)));
  const [maxDaysPerWeek, setMaxDaysPerWeek] = useState(5);
  const [configs, setConfigs] = useState<LocationConfig[] | null>(null);
  const [proposal, setProposal] = useState<ProposedShift[]>([]);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: number } | null>(null);

  const locationConfigs = useMemo<LocationConfig[]>(
    () => configs ?? (locations.data ?? []).map((l) => ({ locationId: l.id, slots: [{ label: t('schedules.preset.morning'), ...PRESETS[0] }], staffPerSlot: 1 })),
    [configs, locations.data, t],
  );

  const periodDays = fromDate && toDate && fromDate <= toDate ? eachDayOfInterval({ start: parseLocalDate(fromDate), end: parseLocalDate(toDate) }) : [];
  const vacationsDuring = (vacations.data ?? []).filter((v) => periodDays.some((d) => isWithinInterval(d, { start: parseLocalDate(v.fromDate), end: parseLocalDate(v.toDate) })));
  const onVacation = new Set(vacationsDuring.map((v) => v.employeeId));
  const available = (employees.data ?? []).filter((e) => !onVacation.has(e.id));
  const prefs = preferences.data ?? [];

  const updateConfig = (locationId: string, patch: Partial<LocationConfig>) => setConfigs(locationConfigs.map((c) => (c.locationId === locationId ? { ...c, ...patch } : c)));
  const updateSlot = (locationId: string, idx: number, patch: Partial<ShiftSlot>) => {
    const cfg = locationConfigs.find((c) => c.locationId === locationId)!;
    updateConfig(locationId, { slots: cfg.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  };

  const generate = () => {
    const shifts: ProposedShift[] = [];
    const assignedDates: Record<string, Set<string>> = {};
    const daysThisWeek: Record<string, Record<string, number>> = {};
    available.forEach((e) => { assignedDates[e.id] = new Set(); daysThisWeek[e.id] = {}; });

    for (const day of periodDays) {
      const dateStr = toISODate(day);
      const weekKey = toISODate(startOfWeek(day, { weekStartsOn: 1 }));
      const dow = DAY_CODE[day.getDay()];
      for (const cfg of locationConfigs) {
        const loc = locations.data!.find((l) => l.id === cfg.locationId)!;
        for (const slot of cfg.slots) {
          const candidates = available
            .filter((e) => !assignedDates[e.id].has(dateStr) && (daysThisWeek[e.id][weekKey] ?? 0) < maxDaysPerWeek)
            .map((e) => {
              const ep = prefs.filter((p) => p.employeeId === e.id && p.dayOfWeek === dow);
              const usual = e.locations?.some((l) => l.locationId === cfg.locationId) ?? false;
              let score = usual ? 4 : 0;
              if (ep.length) {
                score += 10;
                if (ep.some((p) => p.locationId === cfg.locationId)) score += 5;
                if (ep.some((p) => p.startTime <= slot.startTime && p.endTime >= slot.endTime)) score += 3;
              }
              // Fairness: fewer days assigned so far → slightly higher priority
              score -= (daysThisWeek[e.id][weekKey] ?? 0) * 0.5;
              return { e, score };
            })
            .sort((a, b) => b.score - a.score);

          for (let n = 0; n < cfg.staffPerSlot; n++) {
            const c = candidates.shift();
            if (!c) {
              shifts.push({ employeeId: UNASSIGNED, employeeName: t('proposal.noCoverage'), locationId: cfg.locationId, locationName: loc.name, date: dateStr, startTime: slot.startTime, endTime: slot.endTime, warning: true });
            } else {
              assignedDates[c.e.id].add(dateStr);
              daysThisWeek[c.e.id][weekKey] = (daysThisWeek[c.e.id][weekKey] ?? 0) + 1;
              shifts.push({ employeeId: c.e.id, employeeName: c.e.name, locationId: cfg.locationId, locationName: loc.name, date: dateStr, startTime: slot.startTime, endTime: slot.endTime });
            }
          }
        }
      }
    }
    setProposal(shifts);
    setStep(4);
  };

  const apply = async () => {
    setApplying(true);
    let ok = 0, errors = 0;
    for (const s of proposal.filter((x) => x.employeeId !== UNASSIGNED)) {
      try { await create.mutateAsync({ employeeId: s.employeeId, locationId: s.locationId, date: s.date, startTime: s.startTime, endTime: s.endTime }); ok++; }
      catch { errors++; }
    }
    setResult({ ok, errors });
    setApplying(false);
    toast[errors ? 'warning' : 'success'](errors ? t('proposal.resultErrors', { ok, errors }) : t('proposal.resultOk', { n: ok }));
    if (!errors) setTimeout(onApplied, 900);
  };

  const removeProposed = (idx: number) => setProposal(proposal.filter((_, i) => i !== idx));

  const steps = t('proposal.steps', { returnObjects: true }) as string[];
  const totalPerDay = locationConfigs.reduce((s, c) => s + c.slots.length * c.staffPerSlot, 0);
  const validShifts = proposal.filter((s) => s.employeeId !== UNASSIGNED).length;
  const warnings = proposal.length - validShifts;
  const loading = employees.isLoading || locations.isLoading || vacations.isLoading || preferences.isLoading;

  const shortcuts = [
    { key: 'thisWeek', from: toISODate(startOfWeek(new Date(), { weekStartsOn: 1 })), to: toISODate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)) },
    { key: 'nextWeek', from: toISODate(nextMonday), to: toISODate(addDays(nextMonday, 6)) },
    { key: 'weekend', from: toISODate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5)), to: toISODate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6)) },
  ];

  return (
    <Modal open onClose={onClose} size="lg" title={<span className="row gap-2"><Icon name="wand" />{t('proposal.title')}</span>}
      description={<div className="steps mt-2">{steps.map((s, i) => <span key={i} className={`step${step === i + 1 ? ' step-active' : step > i + 1 ? ' step-done' : ''}`}><span className="step-n">{step > i + 1 ? '✓' : i + 1}</span>{s}</span>)}</div>}
      footer={
        <>
          {step > 1 && !result && <Button variant="ghost" icon="chevronLeft" onClick={() => setStep(step - 1)}>{t('proposal.back')}</Button>}
          <div className="grow" />
          {step === 1 && <Button variant="primary" iconRight="arrowRight" disabled={periodDays.length === 0} onClick={() => setStep(2)}>{t('proposal.continue')}</Button>}
          {step === 2 && <Button variant="primary" iconRight="arrowRight" onClick={() => setStep(3)}>{t('proposal.configNeeds')}</Button>}
          {step === 3 && <Button variant="primary" icon="sparkles" onClick={generate} disabled={available.length === 0}>{t('proposal.generate')}</Button>}
          {step === 4 && !result && <Button variant="success" icon="check" loading={applying} onClick={apply} disabled={validShifts === 0}>{t('proposal.apply', { n: validShifts })}</Button>}
          {result && <Button variant="primary" onClick={onApplied}>{t('common.close')}</Button>}
        </>
      }
    >
      {loading ? <div className="row gap-3 t-3" style={{ padding: 30, justifyContent: 'center' }}><span className="spinner" />{t('common.loading')}</div> : (
        <div className="col gap-5">
          {step === 1 && (
            <>
              <div><h3 style={{ fontSize: 16 }}>{t('proposal.periodTitle')}</h3><p className="t-sm t-3 mt-2">{t('proposal.periodDesc')}</p></div>
              <div className="row-wrap">
                {shortcuts.map((s) => <button key={s.key} className={`chip chip-btn${fromDate === s.from && toDate === s.to ? ' chip-active' : ''}`} onClick={() => { setFromDate(s.from); setToDate(s.to); }}>{t(`proposal.${s.key}`)}</button>)}
              </div>
              <div className="form-grid">
                <Field label={t('proposal.from')}><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
                <Field label={t('proposal.to')}><Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} /></Field>
                <Field label={t('proposal.maxDays')} hint={t('proposal.maxDaysHint')}><Input type="number" min={1} max={7} value={maxDaysPerWeek} onChange={(e) => setMaxDaysPerWeek(Math.min(7, Math.max(1, Number(e.target.value) || 1)))} /></Field>
              </div>
              {periodDays.length > 0 && (
                <div className="row-wrap">
                  <Badge tone="brand">{t('proposal.days', { n: periodDays.length })}</Badge>
                  {periodDays.slice(0, 14).map((d) => <span key={d.toISOString()} className="chip">{fmtDate(d, 'EEE d')}</span>)}
                  {periodDays.length > 14 && <span className="chip">+{periodDays.length - 14}</span>}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div><h3 style={{ fontSize: 16 }}>{t('proposal.summaryTitle')}</h3><p className="t-sm t-3 mt-2">{fmtDate(fromDate, 'd MMM')} – {fmtDate(toDate, 'd MMM yyyy')} · {t('proposal.days', { n: periodDays.length })}</p></div>
              <div className="grid-auto">
                <div className="card card-pad-sm">
                  <div className="t-caps mb-3 row gap-2"><Icon name="palmtree" size={13} />{t('proposal.onVacation')}</div>
                  {vacationsDuring.length === 0 ? <p className="t-sm t-4">{t('proposal.noVacations')}</p> : vacationsDuring.map((v) => (
                    <div key={v.id} className="row between t-sm" style={{ padding: '4px 0' }}><span className="t-strong">{v.employee.name}</span><span className="t-3">{fmtDate(v.fromDate, 'd MMM')} → {fmtDate(v.toDate, 'd MMM')}</span></div>
                  ))}
                </div>
                <div className="card card-pad-sm">
                  <div className="t-caps mb-3 row gap-2"><Icon name="users" size={13} />{t('proposal.available')} · {available.length}</div>
                  {available.length === 0 && <p className="t-sm t-danger">{t('proposal.noAvailable')}</p>}
                  {available.map((e) => {
                    const ep = prefs.filter((p) => p.employeeId === e.id);
                    return (
                      <div key={e.id} className="row between t-sm" style={{ padding: '4px 0' }}>
                        <span className="row gap-2"><Avatar name={e.name} id={e.id} size={22} /><span className="t-strong">{e.name}</span></span>
                        <span className="t-3 t-xs">{ep.length ? ep.map((p) => dayLabelFromCode(p.dayOfWeek)).join(' · ') : t('proposal.noPrefs')}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="card card-pad-sm">
                  <div className="t-caps mb-3 row gap-2"><Icon name="mapPin" size={13} />{t('proposal.locationsToCover')}</div>
                  {locations.data?.map((l) => <div key={l.id} className="t-sm t-strong" style={{ padding: '4px 0' }}>{l.name}</div>)}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div><h3 style={{ fontSize: 16 }}>{t('proposal.configTitle')}</h3><p className="t-sm t-3 mt-2">{t('proposal.configDesc')}</p></div>
              {locationConfigs.map((cfg) => {
                const loc = locations.data!.find((l) => l.id === cfg.locationId)!;
                return (
                  <div key={cfg.locationId} className="card card-pad-sm col gap-3">
                    <div className="row between">
                      <span className="t-strong row gap-2"><Icon name="mapPin" size={14} />{loc.name}</span>
                      <span className="row gap-2 t-sm">
                        <span className="t-3">{t('proposal.personsPerShift')}</span>
                        <Button size="sm" icon="minus" onClick={() => updateConfig(cfg.locationId, { staffPerSlot: Math.max(1, cfg.staffPerSlot - 1) })} />
                        <b style={{ minWidth: 16, textAlign: 'center' }}>{cfg.staffPerSlot}</b>
                        <Button size="sm" icon="plus" onClick={() => updateConfig(cfg.locationId, { staffPerSlot: Math.min(Math.max(1, available.length), cfg.staffPerSlot + 1) })} />
                      </span>
                    </div>
                    {cfg.slots.map((slot, idx) => (
                      <div key={idx} className="row-wrap">
                        <Input small value={slot.label} style={{ width: 120 }} onChange={(e) => updateSlot(cfg.locationId, idx, { label: e.target.value })} placeholder={t('proposal.slotName')} />
                        <Input small type="time" value={slot.startTime} style={{ width: 100 }} onChange={(e) => updateSlot(cfg.locationId, idx, { startTime: e.target.value })} />
                        <span className="t-4">→</span>
                        <Input small type="time" value={slot.endTime} style={{ width: 100 }} onChange={(e) => updateSlot(cfg.locationId, idx, { endTime: e.target.value })} />
                        {PRESETS.map((p) => <button key={p.key} className="chip chip-btn" style={{ height: 24, fontSize: 11 }} onClick={() => updateSlot(cfg.locationId, idx, { label: t(`schedules.preset.${p.key}`), startTime: p.startTime, endTime: p.endTime })}>{t(`schedules.preset.${p.key}`)}</button>)}
                        {cfg.slots.length > 1 && <Button size="sm" variant="ghost" icon="x" onClick={() => updateConfig(cfg.locationId, { slots: cfg.slots.filter((_, i) => i !== idx) })} />}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" icon="plus" style={{ alignSelf: 'flex-start' }} onClick={() => updateConfig(cfg.locationId, { slots: [...cfg.slots, { label: t('schedules.preset.midday'), ...PRESETS[1] }] })}>{t('proposal.addShift')}</Button>
                  </div>
                );
              })}
              <div className="notice notice-info"><Icon name="info" /><span>{t('proposal.summaryBox', { days: periodDays.length, assignments: totalPerDay, total: periodDays.length * totalPerDay, employees: available.length })}</span></div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="row between">
                <div><h3 style={{ fontSize: 16 }}>{t('proposal.proposalTitle')}</h3><p className="t-sm t-3 mt-2">{t('proposal.reviewHint')}</p></div>
                <div className="row gap-2"><Badge tone="success">{validShifts} {t('schedules.shiftsShort')}</Badge>{warnings > 0 && <Badge tone="warning">{t('proposal.uncovered', { n: warnings })}</Badge>}</div>
              </div>
              {result && <div className={`notice notice-${result.errors ? 'warning' : 'success'}`}><Icon name={result.errors ? 'alert' : 'checkCircle'} /><span>{result.errors ? t('proposal.resultErrors', { ok: result.ok, errors: result.errors }) : t('proposal.resultOk', { n: result.ok })}</span></div>}
              {periodDays.map((day) => {
                const dateStr = toISODate(day);
                const rows = proposal.map((s, i) => ({ s, i })).filter(({ s }) => s.date === dateStr);
                if (!rows.length) return null;
                return (
                  <div key={dateStr}>
                    <div className="t-caps mb-2" style={{ paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{fmtDate(day, 'EEEE, d MMMM')}</div>
                    <div className="col gap-2">
                      {rows.map(({ s, i }) => (
                        <div key={i} className="row gap-3" style={{ padding: '7px 10px', borderRadius: 8, background: s.warning ? 'var(--warning-bg)' : 'var(--surface-2)' }}>
                          <span className="t-sm t-strong t-num" style={{ width: 92 }}>{s.startTime}–{s.endTime}</span>
                          <span className="t-sm t-3 grow t-truncate">{s.locationName}</span>
                          {s.warning ? <span className="t-sm t-warning row gap-2"><Icon name="alert" size={14} />{s.employeeName}</span> : (
                            <span className="row gap-2 t-sm t-strong"><span className="dot" style={{ background: colorFor(s.employeeId) }} />{s.employeeName}</span>
                          )}
                          {!result && <Button size="sm" variant="ghost" icon="x" onClick={() => removeProposed(i)} aria-label={t('common.delete')} />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="t-xs t-4">{t('proposal.totalNote', { n: fmtNum(validShifts) })}</p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
