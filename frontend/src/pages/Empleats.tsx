import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';
import {
  getEmployees, getVacations, createVacation, updateVacationStatus, deleteVacation,
  getPreferences, savePreference, deletePreference,
} from '../api/employees';
import { getLocations } from '../api/locations';
import type { Employee, VacationRequest, ShiftPreference, Location, VacationStatus, DayOfWeek } from '../types';

// ── Avatar neutral ────────────────────────────────────────────────────────────
const AVATAR_BG = '#E8E4D9';
const AVATAR_COLOR = '#2D3250';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const STATUS_COLOR: Record<VacationStatus, string> = {
  PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444',
};

type Tab = 'employees' | 'vacations' | 'preferences';

export default function Empleats() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'employees', label: t('employees.tabEmployees') },
    { key: 'vacations', label: t('employees.tabVacations') },
    { key: 'preferences', label: t('employees.tabPreferences') },
  ];

  const STATUS_LABEL: Record<VacationStatus, string> = {
    PENDING: t('employees.status.PENDING'),
    APPROVED: t('employees.status.APPROVED'),
    REJECTED: t('employees.status.REJECTED'),
  };

  const DAY_LABELS: Record<DayOfWeek, string> = {
    MON: t('employees.days.MON'), TUE: t('employees.days.TUE'), WED: t('employees.days.WED'),
    THU: t('employees.days.THU'), FRI: t('employees.days.FRI'), SAT: t('employees.days.SAT'), SUN: t('employees.days.SUN'),
  };

  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacations, setVacations] = useState<VacationRequest[]>([]);
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterVacStatus, setFilterVacStatus] = useState('');

  // Formulari vacances
  const [showVacForm, setShowVacForm] = useState(false);
  const [vacForm, setVacForm] = useState({ employeeId: '', fromDate: '', toDate: '', reason: '' });
  const [vacError, setVacError] = useState('');

  // Formulari preferència
  const [showPrefForm, setShowPrefForm] = useState(false);
  const [prefForm, setPrefForm] = useState({
    employeeId: '', dayOfWeek: 'MON' as DayOfWeek,
    startTime: '09:00', endTime: '17:00', locationId: '', notes: '',
  });

  // Nota manager (inline)
  const [managerNoteId, setManagerNoteId] = useState<string | null>(null);
  const [managerNote, setManagerNote] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [emps, vacs, prefs, locs] = await Promise.all([
        getEmployees(), getVacations(), getPreferences(), getLocations(),
      ]);
      setEmployees(emps);
      setVacations(vacs);
      setPreferences(prefs);
      setLocations(locs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Vacances ────────────────────────────────────────────────────────────────

  const handleVacSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVacError('');
    try {
      await createVacation({ ...vacForm, reason: vacForm.reason || null });
      setVacForm({ employeeId: '', fromDate: '', toDate: '', reason: '' });
      setShowVacForm(false);
      const vacs = await getVacations();
      setVacations(vacs);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error en crear la sol·licitud';
      setVacError(msg);
    }
  };

  const handleVacStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await updateVacationStatus(id, status, managerNote || undefined);
    setManagerNoteId(null);
    setManagerNote('');
    const vacs = await getVacations();
    setVacations(vacs);
  };

  const handleVacDelete = async (id: string) => {
    if (!confirm(t('employees.deleteConfirm'))) return;
    await deleteVacation(id);
    const vacs = await getVacations();
    setVacations(vacs);
  };

  // ── Preferències ────────────────────────────────────────────────────────────

  const handlePrefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePreference({
        ...prefForm,
        locationId: prefForm.locationId || null,
        notes: prefForm.notes || null,
      });
      setPrefForm({ employeeId: '', dayOfWeek: 'MON', startTime: '09:00', endTime: '17:00', locationId: '', notes: '' });
      setShowPrefForm(false);
      const prefs = await getPreferences();
      setPreferences(prefs);
    } catch (e) { console.error(e); }
  };

  const handlePrefDelete = async (id: string) => {
    if (!confirm(t('employees.deletePreferenceConfirm'))) return;
    await deletePreference(id);
    const prefs = await getPreferences();
    setPreferences(prefs);
  };

  // ── Filtres ─────────────────────────────────────────────────────────────────

  const filteredVacations = vacations.filter((v) =>
    (!filterEmployee || v.employeeId === filterEmployee) &&
    (!filterVacStatus || v.status === filterVacStatus)
  );

  const filteredPrefs = preferences.filter((p) =>
    !filterEmployee || p.employeeId === filterEmployee
  );

  // ── Agrupació preferències per empleat ──────────────────────────────────────

  const prefsByEmployee: Record<string, ShiftPreference[]> = {};
  filteredPrefs.forEach((p) => {
    if (!prefsByEmployee[p.employeeId]) prefsByEmployee[p.employeeId] = [];
    prefsByEmployee[p.employeeId].push(p);
  });

  if (loading) return <div style={{ padding: 40, color: '#888' }}>{t('common.loading')}</div>;

  return (
    <div>
      <Header title={t('employees.title')} subtitle={t('employees.subtitle')} />

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            style={{ ...styles.tab, ...(tab === tabItem.key ? styles.tabActive : {}) }}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.label}
            {tabItem.key === 'vacations' && vacations.filter((v) => v.status === 'PENDING').length > 0 && (
              <span style={styles.badge}>{vacations.filter((v) => v.status === 'PENDING').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: Empleats ──────────────────────────────────────────────────── */}
      {tab === 'employees' && (
        <div style={styles.grid}>
          {employees.map((emp) => {
            const empVacs = vacations.filter((v) => v.employeeId === emp.id && v.status === 'APPROVED');
            const empPrefs = preferences.filter((p) => p.employeeId === emp.id);
            return (
              <div key={emp.id} style={styles.empCard}>
                <div style={{ ...styles.empAvatar, backgroundColor: AVATAR_BG, color: AVATAR_COLOR }}>{emp.name[0].toUpperCase()}</div>
                <div style={styles.empInfo}>
                  <span style={styles.empName}>{emp.name}</span>
                  {emp.email && <span style={styles.empEmail}>{emp.email}</span>}
                  {emp.phone && <span style={styles.empEmail}>{emp.phone}</span>}
                </div>
                <div style={styles.empStats}>
                  <span style={styles.empStat}>{empVacs.length} {t('employees.approvedVacations')}</span>
                  <span style={styles.empStat}>{empPrefs.length} {t('employees.preferences')}</span>
                </div>
              </div>
            );
          })}
          {employees.length === 0 && <p style={styles.empty}>{t('employees.noEmployees')}</p>}
        </div>
      )}

      {/* ─── TAB: Vacances ──────────────────────────────────────────────────── */}
      {tab === 'vacations' && (
        <div>
          <div style={styles.toolbar}>
            <div style={styles.filters}>
              <select style={styles.filterSelect} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                <option value="">{t('employees.allEmployees')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select style={styles.filterSelect} value={filterVacStatus} onChange={(e) => setFilterVacStatus(e.target.value)}>
                <option value="">{t('employees.allStatuses')}</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button style={styles.primaryBtn} onClick={() => setShowVacForm(!showVacForm)}>
              {showVacForm ? t('employees.cancelBtn') : t('employees.newRequest')}
            </button>
          </div>

          {showVacForm && (
            <div style={styles.formCard}>
              <h3 style={styles.formTitle}>{t('employees.newVacationRequest')}</h3>
              <form onSubmit={handleVacSubmit} style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('common.employee')}</label>
                  <select style={styles.input} value={vacForm.employeeId}
                    onChange={(e) => setVacForm({ ...vacForm, employeeId: e.target.value })} required>
                    <option value="">{t('schedules.selectEmployee')}</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('employees.from')}</label>
                  <input type="date" style={styles.input} value={vacForm.fromDate}
                    onChange={(e) => setVacForm({ ...vacForm, fromDate: e.target.value })} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('employees.to')}</label>
                  <input type="date" style={styles.input} value={vacForm.toDate}
                    onChange={(e) => setVacForm({ ...vacForm, toDate: e.target.value })} required />
                </div>
                <div style={{ ...styles.field, flex: 2 }}>
                  <label style={styles.label}>{t('employees.reason')}</label>
                  <input type="text" style={styles.input} value={vacForm.reason}
                    onChange={(e) => setVacForm({ ...vacForm, reason: e.target.value })}
                    placeholder={t('employees.reasonPlaceholder')} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" style={styles.primaryBtn}>{t('employees.create')}</button>
                </div>
              </form>
              {vacError && <p style={styles.error}>{vacError}</p>}
            </div>
          )}

          <div style={styles.vacList}>
            {filteredVacations.length === 0 && <p style={styles.empty}>{t('employees.noRequests')}</p>}
            {filteredVacations.map((v) => (
              <div key={v.id} style={styles.vacCard}>
                <div style={styles.vacLeft}>
                  <span style={styles.vacEmp}>{v.employee.name}</span>
                  <span style={styles.vacDates}>
                    {format(parseISO(v.fromDate), 'd MMM yyyy')} → {format(parseISO(v.toDate), 'd MMM yyyy')}
                  </span>
                  {v.reason && <span style={styles.vacReason}>{v.reason}</span>}
                  {v.managerNote && <span style={styles.vacManagerNote}>Nota: {v.managerNote}</span>}
                </div>
                <div style={styles.vacRight}>
                  <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLOR[v.status] + '20', color: STATUS_COLOR[v.status] }}>
                    {STATUS_LABEL[v.status]}
                  </span>

                  {v.status === 'PENDING' && isManager && (
                    <div style={styles.vacActions}>
                      {managerNoteId === v.id ? (
                        <div style={styles.noteInline}>
                          <input
                            style={{ ...styles.input, fontSize: 12 }}
                            placeholder={t('employees.optionalNote')}
                            value={managerNote}
                            onChange={(e) => setManagerNote(e.target.value)}
                          />
                          <button style={{ ...styles.approveBtn }} onClick={() => handleVacStatus(v.id, 'APPROVED')}>{t('employees.approve')}</button>
                          <button style={{ ...styles.rejectBtn }} onClick={() => handleVacStatus(v.id, 'REJECTED')}>{t('employees.reject')}</button>
                          <button style={styles.cancelNoteBtn} onClick={() => setManagerNoteId(null)}>×</button>
                        </div>
                      ) : (
                        <button style={styles.reviewBtn} onClick={() => { setManagerNoteId(v.id); setManagerNote(''); }}>
                          {t('employees.manage')}
                        </button>
                      )}
                    </div>
                  )}

                  {v.status !== 'APPROVED' && (
                    <button style={styles.deleteBtn} onClick={() => handleVacDelete(v.id)}>{t('employees.delete')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: Preferències ──────────────────────────────────────────────── */}
      {tab === 'preferences' && (
        <div>
          <div style={styles.toolbar}>
            <div style={styles.filters}>
              <select style={styles.filterSelect} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                <option value="">{t('employees.allEmployees')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <button style={styles.primaryBtn} onClick={() => setShowPrefForm(!showPrefForm)}>
              {showPrefForm ? t('employees.cancelBtn') : t('employees.newPreference')}
            </button>
          </div>

          {showPrefForm && (
            <div style={styles.formCard}>
              <h3 style={styles.formTitle}>{t('employees.shiftPreference')}</h3>
              <form onSubmit={handlePrefSubmit} style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>{t('common.employee')}</label>
                  <select style={styles.input} value={prefForm.employeeId}
                    onChange={(e) => setPrefForm({ ...prefForm, employeeId: e.target.value })} required>
                    <option value="">{t('schedules.selectEmployee')}</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('employees.dayOfWeek')}</label>
                  <select style={styles.input} value={prefForm.dayOfWeek}
                    onChange={(e) => setPrefForm({ ...prefForm, dayOfWeek: e.target.value as DayOfWeek })} required>
                    {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('schedules.startTime')}</label>
                  <input type="time" style={styles.input} value={prefForm.startTime}
                    onChange={(e) => setPrefForm({ ...prefForm, startTime: e.target.value })} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('schedules.endTime')}</label>
                  <input type="time" style={styles.input} value={prefForm.endTime}
                    onChange={(e) => setPrefForm({ ...prefForm, endTime: e.target.value })} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('employees.preferredLocation')}</label>
                  <select style={styles.input} value={prefForm.locationId}
                    onChange={(e) => setPrefForm({ ...prefForm, locationId: e.target.value })}>
                    <option value="">{t('employees.anyLocation')}</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div style={{ ...styles.field, flex: 2 }}>
                  <label style={styles.label}>{t('schedules.notes')}</label>
                  <input type="text" style={styles.input} value={prefForm.notes}
                    onChange={(e) => setPrefForm({ ...prefForm, notes: e.target.value })}
                    placeholder={t('employees.notesPlaceholder')} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" style={styles.primaryBtn}>{t('employees.save')}</button>
                </div>
              </form>
            </div>
          )}

          {/* Vista per empleat */}
          {Object.entries(prefsByEmployee).length === 0 && (
            <p style={styles.empty}>{t('employees.noPreferences')}</p>
          )}
          {Object.entries(prefsByEmployee).map(([empId, prefs]) => {
            const emp = employees.find((e) => e.id === empId);
            return (
              <div key={empId} style={styles.prefGroup}>
                <div style={styles.prefGroupHeader}>
                  <span style={{ ...styles.prefGroupAvatar, backgroundColor: AVATAR_BG, color: AVATAR_COLOR }}>{emp?.name[0].toUpperCase()}</span>
                  <span style={styles.prefGroupName}>{emp?.name ?? empId}</span>
                  <span style={styles.prefGroupCount}>{prefs.length} {t('employees.configuredDays')}</span>
                </div>
                <div style={styles.prefGrid}>
                  {DAYS.map((day) => {
                    const pref = prefs.find((p) => p.dayOfWeek === day);
                    return (
                      <div key={day} style={{ ...styles.prefDayCard, ...(pref ? styles.prefDayCardFilled : {}) }}>
                        <span style={styles.prefDayLabel}>{DAY_LABELS[day]}</span>
                        {pref ? (
                          <>
                            <span style={styles.prefTime}>{pref.startTime}–{pref.endTime}</span>
                            {pref.locationId && (
                              <span style={styles.prefLoc}>
                                {locations.find((l) => l.id === pref.locationId)?.name ?? ''}
                              </span>
                            )}
                            {pref.notes && <span style={styles.prefNotes}>{pref.notes}</span>}
                            <button style={styles.prefDeleteBtn} onClick={() => handlePrefDelete(pref.id)}>×</button>
                          </>
                        ) : (
                          <span style={styles.prefEmpty}>{t('employees.noPreference')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E8E4D9', paddingBottom: 0 },
  tab: {
    padding: '9px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: '#6B7280', borderBottom: '2px solid transparent',
    marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease',
  },
  tabActive: { color: '#2D3250', borderBottom: '2px solid #F4E285' },
  badge: {
    backgroundColor: '#c0392b', color: '#fff', borderRadius: 10,
    fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 16, textAlign: 'center',
  },

  // Empleats grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  empCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(45,50,80,0.07)', display: 'flex', flexDirection: 'column', gap: 8,
    cursor: 'pointer', transition: 'all 0.15s ease', border: '1px solid #E8E4D9',
  },
  empAvatar: {
    width: 40, height: 40, borderRadius: '50%', backgroundColor: '#2D3250',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700,
  },
  empInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  empName: { fontSize: 15, fontWeight: 700, color: '#2D3250' },
  empEmail: { fontSize: 12, color: '#6B7280' },
  empStats: { display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 },
  empStat: { fontSize: 12, color: '#6B7280' },

  // Toolbar
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  filters: { display: 'flex', gap: 10 },
  filterSelect: { padding: '7px 10px', border: '1.5px solid #E8E4D9', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff', color: '#2D3250' },
  primaryBtn: { padding: '9px 18px', backgroundColor: '#2D3250', color: '#F4E285', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' },

  // Formulari
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 4px rgba(45,50,80,0.07)', border: '1px solid #E8E4D9' },
  formTitle: { fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: '#2D3250' },
  formRow: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280' },
  input: { padding: '8px 10px', border: '1.5px solid #E8E4D9', borderRadius: 6, fontSize: 13, outline: 'none', transition: 'border-color 0.15s ease' },
  error: { fontSize: 13, color: '#c0392b', margin: '10px 0 0', padding: '8px 12px', backgroundColor: 'rgba(192,57,43,0.06)', borderRadius: 6, border: '1px solid rgba(192,57,43,0.2)' },

  // Vacances
  vacList: { display: 'flex', flexDirection: 'column', gap: 10 },
  vacCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: '14px 18px',
    boxShadow: '0 1px 4px rgba(45,50,80,0.07)', display: 'flex',
    justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
    border: '1px solid #E8E4D9',
  },
  vacLeft: { display: 'flex', flexDirection: 'column', gap: 3 },
  vacEmp: { fontSize: 14, fontWeight: 700, color: '#2D3250' },
  vacDates: { fontSize: 13, color: '#4f7bdb', fontWeight: 600 },
  vacReason: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  vacManagerNote: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vacRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' },
  vacActions: { display: 'flex', gap: 6, alignItems: 'center' },
  noteInline: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  reviewBtn: { padding: '5px 12px', border: '1.5px solid #2D3250', borderRadius: 6, background: 'transparent', color: '#2D3250', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s ease' },
  approveBtn: { padding: '5px 12px', border: 'none', borderRadius: 6, background: '#5aab7a', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s ease' },
  rejectBtn: { padding: '5px 12px', border: 'none', borderRadius: 6, background: '#c0392b', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s ease' },
  cancelNoteBtn: { background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16, fontWeight: 700 },
  deleteBtn: { padding: '5px 12px', border: '1.5px solid #c0392b', borderRadius: 6, background: 'transparent', color: '#c0392b', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease' },

  // Preferències
  prefGroup: { backgroundColor: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(45,50,80,0.07)', border: '1px solid #E8E4D9' },
  prefGroupHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  prefGroupAvatar: {
    width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2D3250',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
  },
  prefGroupName: { fontSize: 14, fontWeight: 700, color: '#2D3250', flex: 1 },
  prefGroupCount: { fontSize: 12, color: '#6B7280' },
  prefGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 },
  prefDayCard: {
    borderRadius: 8, padding: '10px 8px', border: '1.5px dashed #E8E4D9',
    display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', minHeight: 80,
  },
  prefDayCardFilled: { border: '1.5px solid #F4E285', backgroundColor: '#fffbea' },
  prefDayLabel: { fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.3px' },
  prefTime: { fontSize: 12, fontWeight: 700, color: '#2D3250' },
  prefLoc: { fontSize: 10, color: '#6B7280' },
  prefNotes: { fontSize: 10, color: '#6B7280', fontStyle: 'italic' },
  prefEmpty: { fontSize: 10, color: '#B0AEAD', marginTop: 'auto' },
  prefDeleteBtn: {
    position: 'absolute', top: 4, right: 4, background: 'transparent',
    border: 'none', color: '#B0AEAD', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
  },
  empty: { color: '#B0AEAD', fontSize: 13 },
};
