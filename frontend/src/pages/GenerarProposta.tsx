import { useEffect, useState } from 'react';
import { addDays, format, parseISO, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getEmployees, getVacations, getPreferences } from '../api/employees';
import { getLocations } from '../api/locations';
import { createSchedule } from '../api/schedules';
import type { Employee, Location, VacationRequest, ShiftPreference, DayOfWeek } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftSlot {
  label: string;
  startTime: string;
  endTime: string;
}

interface LocationConfig {
  locationId: string;
  slots: ShiftSlot[];
  staffPerSlot: number;
}

interface ProposedShift {
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  date: string;          // YYYY-MM-DD
  startTime: string;
  endTime: string;
  warning?: string;
}

const DAY_CODE: Record<string, DayOfWeek> = {
  '1': 'MON', '2': 'TUE', '3': 'WED', '4': 'THU', '5': 'FRI', '6': 'SAT', '0': 'SUN',
};

const PRESET_SLOTS: ShiftSlot[] = [
  { label: 'Matí', startTime: '07:00', endTime: '15:00' },
  { label: 'Migdia', startTime: '11:00', endTime: '19:00' },
  { label: 'Tarda', startTime: '15:00', endTime: '23:00' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onApplied: () => void;
}

export default function GenerarProposta({ onClose, onApplied }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  // Dades base
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1 — Període
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));

  // Step 3 — Configuració per local
  const [locationConfigs, setLocationConfigs] = useState<LocationConfig[]>([]);

  // Step 4 — Proposta generada
  const [proposal, setProposal] = useState<ProposedShift[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: number; errors: number } | null>(null);

  useEffect(() => {
    Promise.all([getEmployees(), getLocations(), getVacations({ status: 'APPROVED' }), getPreferences()])
      .then(([emps, locs, vacs, prefs]) => {
        setEmployees(emps);
        setLocations(locs);
        setVacations(vacs);
        setPreferences(prefs);
        setLocationConfigs(locs.map((l) => ({
          locationId: l.id,
          slots: [{ ...PRESET_SLOTS[0] }],
          staffPerSlot: 1,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Dades derivades ────────────────────────────────────────────────────────

  const periodDays = fromDate && toDate
    ? eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) })
    : [];

  const vacationsDuringPeriod = vacations.filter((v) => {
    const vFrom = parseISO(v.fromDate);
    const vTo = parseISO(v.toDate);
    return periodDays.some((d) => isWithinInterval(d, { start: vFrom, end: vTo }));
  });

  const employeesOnVacation = new Set(vacationsDuringPeriod.map((v) => v.employeeId));
  const availableEmployees = employees.filter((e) => !employeesOnVacation.has(e.id));

  // ── Helpers de configuració ────────────────────────────────────────────────

  const updateConfig = (locationId: string, patch: Partial<LocationConfig>) => {
    setLocationConfigs((prev) =>
      prev.map((c) => (c.locationId === locationId ? { ...c, ...patch } : c))
    );
  };

  const addSlot = (locationId: string) => {
    setLocationConfigs((prev) =>
      prev.map((c) =>
        c.locationId === locationId
          ? { ...c, slots: [...c.slots, { label: t('schedules.newShiftForm'), startTime: '09:00', endTime: '17:00' }] }
          : c
      )
    );
  };

  const updateSlot = (locationId: string, idx: number, patch: Partial<ShiftSlot>) => {
    setLocationConfigs((prev) =>
      prev.map((c) =>
        c.locationId === locationId
          ? { ...c, slots: c.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
          : c
      )
    );
  };

  const removeSlot = (locationId: string, idx: number) => {
    setLocationConfigs((prev) =>
      prev.map((c) =>
        c.locationId === locationId
          ? { ...c, slots: c.slots.filter((_, i) => i !== idx) }
          : c
      )
    );
  };

  // ── Algoritme de proposta ──────────────────────────────────────────────────

  const generateProposal = () => {
    const shifts: ProposedShift[] = [];
    // Seguiment d'assignació: empId → set de dates ja assignades
    const assignedDates: Record<string, Set<string>> = {};
    availableEmployees.forEach((e) => (assignedDates[e.id] = new Set()));

    for (const day of periodDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      // date-fns 'i' és 1=Mon…7=Sun, però getDay és 0=Sun…6=Sat
      const jsDay = String(day.getDay()) as string;
      const dayOfWeek = DAY_CODE[jsDay];

      for (const cfg of locationConfigs) {
        const loc = locations.find((l) => l.id === cfg.locationId)!;

        for (const slot of cfg.slots) {
          // Candidats: disponibles, no assignats avui, ordenats per score
          const candidates = availableEmployees
            .filter((e) => !assignedDates[e.id].has(dateStr))
            .map((e) => {
              const prefs = preferences.filter(
                (p) => p.employeeId === e.id && p.dayOfWeek === dayOfWeek
              );
              let score = 0;
              if (prefs.length > 0) {
                score += 10; // té preferència per aquest dia
                if (prefs.some((p) => p.locationId === cfg.locationId)) score += 5; // local preferit
                if (prefs.some((p) => p.startTime === slot.startTime)) score += 3; // hora coincideix
              }
              return { employee: e, score };
            })
            .sort((a, b) => b.score - a.score);

          // Assigna el nombre de persones necessàries
          for (let n = 0; n < cfg.staffPerSlot; n++) {
            const candidate = candidates[n];
            if (!candidate) {
              // No hi ha prou empleats disponibles
              shifts.push({
                employeeId: '__unassigned__',
                employeeName: t('proposal.noCoverage'),
                locationId: cfg.locationId,
                locationName: loc.name,
                date: dateStr,
                startTime: slot.startTime,
                endTime: slot.endTime,
                warning: t('proposal.noShiftWarning'),
              });
            } else {
              assignedDates[candidate.employee.id].add(dateStr);
              // Elimina el candidat de la llista per a la propera iteració staffPerSlot
              candidates.splice(n, 1);
              shifts.push({
                employeeId: candidate.employee.id,
                employeeName: candidate.employee.name,
                locationId: cfg.locationId,
                locationName: loc.name,
                date: dateStr,
                startTime: slot.startTime,
                endTime: slot.endTime,
              });
            }
          }
        }
      }
    }

    setProposal(shifts);
    setStep(4);
  };

  // ── Aplicar proposta ───────────────────────────────────────────────────────

  const applyProposal = async () => {
    setApplying(true);
    let ok = 0;
    let errors = 0;

    const validShifts = proposal.filter((s) => s.employeeId !== '__unassigned__');
    for (const s of validShifts) {
      try {
        await createSchedule({
          employeeId: s.employeeId,
          locationId: s.locationId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        });
        ok++;
      } catch {
        errors++;
      }
    }

    setApplyResult({ ok, errors });
    setApplying(false);
    if (errors === 0) {
      setTimeout(() => { onApplied(); }, 1500);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>{t('common.loading')}</p>
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{t('proposal.title')}</h2>
            <div style={styles.steps}>
              {(t('proposal.steps', { returnObjects: true }) as string[]).map((s, i) => (
                <span key={i} style={{ ...styles.stepDot, ...(step === i + 1 ? styles.stepDotActive : step > i + 1 ? styles.stepDotDone : {}) }}>
                  {i + 1} {s}
                </span>
              ))}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>{t('proposal.close')}</button>
        </div>

        <div style={styles.body}>

          {/* ── STEP 1: Període ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h3 style={styles.stepTitle}>{t('proposal.periodTitle')}</h3>
              <p style={styles.stepDesc}>{t('proposal.periodDesc')}</p>

              <div style={styles.periodRow}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('proposal.from')}</label>
                  <input type="date" style={styles.input} value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div style={styles.fieldSep}>→</div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('proposal.to')}</label>
                  <input type="date" style={styles.input} value={toDate}
                    onChange={(e) => setToDate(e.target.value)} min={fromDate} />
                </div>
              </div>

              {periodDays.length > 0 && (
                <div style={styles.periodPreview}>
                  <span style={styles.periodBadge}>{periodDays.length} dies</span>
                  {periodDays.map((d) => (
                    <span key={d.toISOString()} style={styles.dayBadge}>
                      {format(d, 'EEE d', { locale: ca })}
                    </span>
                  ))}
                </div>
              )}

              {/* Dreceres */}
              <div style={styles.shortcuts}>
                {[
                  { label: t('proposal.thisWeek'), from: format(new Date(), 'yyyy-MM-dd'), to: format(addDays(new Date(), 6), 'yyyy-MM-dd') },
                  { label: t('proposal.nextWeek'), from: format(addDays(new Date(), 7), 'yyyy-MM-dd'), to: format(addDays(new Date(), 13), 'yyyy-MM-dd') },
                  { label: t('proposal.weekend'), from: format(addDays(new Date(), (6 - new Date().getDay() + 6) % 7), 'yyyy-MM-dd'), to: format(addDays(new Date(), (6 - new Date().getDay() + 7) % 7), 'yyyy-MM-dd') },
                ].map((s) => (
                  <button key={s.label} style={styles.shortcutBtn}
                    onClick={() => { setFromDate(s.from); setToDate(s.to); }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Resum automàtic ─────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h3 style={styles.stepTitle}>{t('proposal.summaryTitle')}</h3>
              <p style={styles.stepDesc}>
                {format(parseISO(fromDate), 'd MMM', { locale: ca })} – {format(parseISO(toDate), 'd MMM yyyy', { locale: ca })} · {periodDays.length} dies
              </p>

              <div style={styles.summaryGrid}>
                {/* Empleats de vacances */}
                <div style={styles.summaryCard}>
                  <div style={styles.summaryCardHeader}>
                    <span style={styles.summaryIcon}>·</span>
                    <span style={styles.summaryCardTitle}>{t('proposal.onVacation')}</span>
                  </div>
                  {vacationsDuringPeriod.length === 0 ? (
                    <p style={styles.summaryEmpty}>{t('proposal.noVacations')}</p>
                  ) : (
                    vacationsDuringPeriod.map((v) => {
                      const emp = employees.find((e) => e.id === v.employeeId);
                      return (
                        <div key={v.id} style={styles.summaryRow}>
                          <span style={styles.summaryName}>{emp?.name ?? v.employeeId}</span>
                          <span style={styles.summaryMeta}>
                            {format(parseISO(v.fromDate), 'd MMM', { locale: ca })} → {format(parseISO(v.toDate), 'd MMM', { locale: ca })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Empleats disponibles */}
                <div style={styles.summaryCard}>
                  <div style={styles.summaryCardHeader}>
                    <span style={styles.summaryIcon}>·</span>
                    <span style={styles.summaryCardTitle}>{t('proposal.available')}</span>
                  </div>
                  {availableEmployees.map((e) => {
                    const prefs = preferences.filter((p) => p.employeeId === e.id);
                    return (
                      <div key={e.id} style={styles.summaryRow}>
                        <span style={styles.summaryName}>{e.name}</span>
                        <span style={styles.summaryMeta}>
                          {prefs.length > 0
                            ? `Preferències: ${prefs.map((p) => ({ MON: 'dl', TUE: 'dt', WED: 'dc', THU: 'dj', FRI: 'dv', SAT: 'ds', SUN: 'dg' }[p.dayOfWeek])).join(', ')}`
                            : 'Sense preferències definides'}
                        </span>
                      </div>
                    );
                  })}
                  {availableEmployees.length === 0 && (
                    <p style={{ ...styles.summaryEmpty, color: '#ef4444' }}>
                      {t('proposal.noAvailable')}
                    </p>
                  )}
                </div>

                {/* Locals */}
                <div style={styles.summaryCard}>
                  <div style={styles.summaryCardHeader}>
                    <span style={styles.summaryIcon}>·</span>
                    <span style={styles.summaryCardTitle}>{t('proposal.locationsToCover')}</span>
                  </div>
                  {locations.map((l) => (
                    <div key={l.id} style={styles.summaryRow}>
                      <span style={styles.summaryName}>{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Qüestionari ─────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h3 style={styles.stepTitle}>{t('proposal.configTitle')}</h3>
              <p style={styles.stepDesc}>
                {t('proposal.configDesc')}
              </p>

              <div style={styles.configList}>
                {locationConfigs.map((cfg) => {
                  const loc = locations.find((l) => l.id === cfg.locationId)!;
                  return (
                    <div key={cfg.locationId} style={styles.configCard}>
                      <div style={styles.configCardHeader}>
                        <span style={styles.configLocName}>{loc.name}</span>
                        <div style={styles.staffRow}>
                          <label style={styles.label}>{t('proposal.personsPerShift')}</label>
                          <div style={styles.counter}>
                            <button style={styles.counterBtn}
                              onClick={() => updateConfig(cfg.locationId, { staffPerSlot: Math.max(1, cfg.staffPerSlot - 1) })}>−</button>
                            <span style={styles.counterVal}>{cfg.staffPerSlot}</span>
                            <button style={styles.counterBtn}
                              onClick={() => updateConfig(cfg.locationId, { staffPerSlot: Math.min(availableEmployees.length, cfg.staffPerSlot + 1) })}>+</button>
                          </div>
                        </div>
                      </div>

                      <div style={styles.slotsSection}>
                        <span style={styles.label}>{t('proposal.dailyShifts')}</span>
                        {cfg.slots.map((slot, idx) => (
                          <div key={idx} style={styles.slotRow}>
                            <input
                              style={{ ...styles.input, width: 110 }}
                              value={slot.label}
                              onChange={(e) => updateSlot(cfg.locationId, idx, { label: e.target.value })}
                              placeholder="Nom torn"
                            />
                            <input type="time" style={{ ...styles.input, width: 90 }}
                              value={slot.startTime}
                              onChange={(e) => updateSlot(cfg.locationId, idx, { startTime: e.target.value })} />
                            <span style={{ color: '#aaa', fontSize: 13 }}>→</span>
                            <input type="time" style={{ ...styles.input, width: 90 }}
                              value={slot.endTime}
                              onChange={(e) => updateSlot(cfg.locationId, idx, { endTime: e.target.value })} />
                            {cfg.slots.length > 1 && (
                              <button style={styles.removeSlotBtn} onClick={() => removeSlot(cfg.locationId, idx)}>×</button>
                            )}
                            {/* Dreceres */}
                            {PRESET_SLOTS.map((p) => (
                              <button key={p.label} style={styles.presetBtn}
                                onClick={() => updateSlot(cfg.locationId, idx, p)}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        ))}
                        <button style={styles.addSlotBtn} onClick={() => addSlot(cfg.locationId)}>
                          {t('proposal.addShift')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.summaryBox}>
                {t('proposal.summaryBox', {
                  days: periodDays.length,
                  assignments: locationConfigs.reduce((s, c) => s + c.slots.length * c.staffPerSlot, 0),
                  total: periodDays.length * locationConfigs.reduce((s, c) => s + c.slots.length * c.staffPerSlot, 0),
                  employees: availableEmployees.length,
                })}
              </div>
            </div>
          )}

          {/* ── STEP 4: Proposta ────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h3 style={styles.stepTitle}>{t('proposal.proposalTitle')}</h3>
              <p style={styles.stepDesc}>
                {t('proposal.warningNote')}
              </p>

              {applyResult && (
                <div style={{ ...styles.summaryBox, backgroundColor: applyResult.errors === 0 ? '#f0fdf4' : '#fff7ed', borderColor: applyResult.errors === 0 ? '#86efac' : '#fdba74', marginBottom: 16 }}>
                  {applyResult.errors === 0
                    ? t('proposal.resultOk', { n: applyResult.ok })
                    : t('proposal.resultErrors', { ok: applyResult.ok, errors: applyResult.errors })}
                </div>
              )}

              {/* Vista per dia */}
              {periodDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayShifts = proposal.filter((s) => s.date === dateStr);
                if (dayShifts.length === 0) return null;
                return (
                  <div key={dateStr} style={styles.daySection}>
                    <div style={styles.daySectionHeader}>
                      {format(day, 'EEEE, d MMMM', { locale: ca })}
                    </div>
                    <div style={styles.shiftList}>
                      {dayShifts.map((s, i) => (
                        <div key={i} style={{ ...styles.shiftRow, ...(s.warning ? styles.shiftRowWarning : {}) }}>
                          <span style={styles.shiftTime}>{s.startTime}–{s.endTime}</span>
                          <span style={styles.shiftLoc}>{s.locationName}</span>
                          <span style={s.warning ? styles.shiftEmpWarning : styles.shiftEmp}>{s.employeeName}</span>
                          {s.warning && <span style={styles.warningNote}>{s.warning}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div style={styles.footer}>
          {step > 1 && !applyResult && (
            <button style={styles.backBtn} onClick={() => setStep(step - 1)}>{t('proposal.back')}</button>
          )}
          <div style={{ flex: 1 }} />

          {step === 1 && (
            <button style={styles.nextBtn}
              disabled={!fromDate || !toDate || fromDate > toDate}
              onClick={() => setStep(2)}>
              {t('proposal.continue')}
            </button>
          )}
          {step === 2 && (
            <button style={styles.nextBtn} onClick={() => setStep(3)}>
              {t('proposal.configNeeds')}
            </button>
          )}
          {step === 3 && (
            <button style={styles.nextBtn} onClick={generateProposal}
              disabled={availableEmployees.length === 0}>
              {t('proposal.generate')}
            </button>
          )}
          {step === 4 && !applyResult && (
            <button style={{ ...styles.nextBtn, backgroundColor: '#059669' }}
              onClick={applyProposal} disabled={applying}>
              {applying ? t('proposal.applying') : t('proposal.apply', { n: proposal.filter((s) => s.employeeId !== '__unassigned__').length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 780,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    padding: '20px 24px 16px', borderBottom: '1px solid #eee',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: '0 0 10px' },
  steps: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  stepDot: {
    fontSize: 11, padding: '3px 10px', borderRadius: 20,
    backgroundColor: '#f0f0f0', color: '#999', fontWeight: 600,
  },
  stepDotActive: { backgroundColor: '#1a1a2e', color: '#fff' },
  stepDotDone: { backgroundColor: '#d1fae5', color: '#065f46' },
  closeBtn: {
    background: 'transparent', border: 'none', fontSize: 22, color: '#aaa',
    cursor: 'pointer', lineHeight: 1, marginTop: -4,
  },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  footer: {
    padding: '14px 24px', borderTop: '1px solid #eee',
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  },

  stepTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' },
  stepDesc: { fontSize: 13, color: '#888', margin: '0 0 20px' },

  // Step 1
  periodRow: { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 },
  fieldSep: { fontSize: 20, color: '#aaa', marginBottom: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  input: { padding: '9px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none' },
  periodPreview: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  periodBadge: {
    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
    backgroundColor: '#1a1a2e', color: '#fff',
  },
  dayBadge: {
    fontSize: 11, padding: '4px 10px', borderRadius: 20,
    backgroundColor: '#f0f0f8', color: '#555',
  },
  shortcuts: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  shortcutBtn: {
    padding: '6px 14px', border: '1.5px solid #ddd', borderRadius: 8,
    background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555',
  },

  // Step 2
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 },
  summaryCard: {
    backgroundColor: '#f8f8fc', borderRadius: 10, padding: '14px 16px',
    border: '1px solid #e8e8f0',
  },
  summaryCardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryIcon: { fontSize: 18 },
  summaryCardTitle: { fontSize: 12, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.3px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8 },
  summaryName: { fontSize: 13, fontWeight: 600, color: '#1a1a2e' },
  summaryMeta: { fontSize: 11, color: '#888', textAlign: 'right' },
  summaryEmpty: { fontSize: 12, color: '#aaa', fontStyle: 'italic', margin: 0 },

  // Step 3
  configList: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 },
  configCard: {
    border: '1.5px solid #e0e0ee', borderRadius: 10, padding: '16px 18px',
  },
  configCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  configLocName: { fontSize: 14, fontWeight: 700, color: '#1a1a2e' },
  staffRow: { display: 'flex', alignItems: 'center', gap: 10 },
  counter: { display: 'flex', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 28, height: 28, border: '1.5px solid #ddd', borderRadius: 6,
    background: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#555',
  },
  counterVal: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', minWidth: 20, textAlign: 'center' },
  slotsSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  slotRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  removeSlotBtn: {
    background: 'transparent', border: 'none', color: '#e53e3e',
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
  },
  presetBtn: {
    padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6,
    background: '#f8f8fc', fontSize: 11, cursor: 'pointer', color: '#666',
  },
  addSlotBtn: {
    alignSelf: 'flex-start', padding: '5px 12px', border: '1.5px dashed #aaa',
    borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#777', marginTop: 4,
  },
  summaryBox: {
    backgroundColor: '#f0f0f8', borderRadius: 8, padding: '12px 16px',
    fontSize: 13, color: '#444', border: '1px solid #dde',
  },

  // Step 4
  daySection: { marginBottom: 16 },
  daySectionHeader: {
    fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: 8, paddingBottom: 6,
    borderBottom: '1px solid #eee',
  },
  shiftList: { display: 'flex', flexDirection: 'column', gap: 6 },
  shiftRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
    backgroundColor: '#f8f8fc', borderRadius: 8, flexWrap: 'wrap',
  },
  shiftRowWarning: { backgroundColor: '#fffbeb', border: '1px solid #fde68a' },
  shiftTime: { fontSize: 12, fontWeight: 700, color: '#4f46e5', minWidth: 100 },
  shiftLoc: { fontSize: 12, color: '#888', flex: 1 },
  shiftEmp: { fontSize: 13, fontWeight: 600, color: '#1a1a2e' },
  shiftEmpWarning: { fontSize: 13, fontWeight: 600, color: '#f59e0b' },
  warningNote: { fontSize: 11, color: '#92400e', fontStyle: 'italic', width: '100%' },

  // Buttons
  backBtn: {
    padding: '9px 18px', border: '1.5px solid #ddd', borderRadius: 8,
    background: '#fff', fontSize: 13, cursor: 'pointer', color: '#555',
  },
  nextBtn: {
    padding: '10px 22px', backgroundColor: '#1a1a2e', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
};
