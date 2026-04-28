import { useEffect, useState } from 'react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import { getSchedules, createSchedule, deleteSchedule } from '../api/schedules';
import { getLocations, getEmployees } from '../api/locations';
import type { Schedule, Location, Employee } from '../types';
import GenerarProposta from './GenerarProposta';

// Colors subtils per distingir empleats al calendari
const EMP_COLORS = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  { bg: '#FDF2F8', border: '#FBCFE8', text: '#9D174D' },
  { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
  { bg: '#ECFEFF', border: '#A5F3FC', text: '#164E63' },
];
function empColorIdx(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return EMP_COLORS[Math.abs(hash) % EMP_COLORS.length];
}

export default function Horaris() {
  const { t } = useTranslation();
  const DAYS = t('schedules.days', { returnObjects: true }) as string[];
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const [form, setForm] = useState({
    employeeId: '',
    locationId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchSchedules = () => {
    const from = format(weekStart, 'yyyy-MM-dd');
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    getSchedules({ from, to, ...(filterLocation ? { locationId: filterLocation } : {}) })
      .then(setSchedules)
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([getLocations(), getEmployees()])
      .then(([locs, emps]) => {
        setLocations(locs);
        setEmployees(emps);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSchedules(); }, [weekStart, filterLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSchedule({ ...form, notes: form.notes || null });
      setShowForm(false);
      setForm({ employeeId: '', locationId: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '17:00', notes: '' });
      fetchSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPrevWeek = async () => {
    setCopying(true);
    try {
      const prevFrom = format(addDays(weekStart, -7), 'yyyy-MM-dd');
      const prevTo = format(addDays(weekStart, -1), 'yyyy-MM-dd');
      const prevSchedules = await getSchedules({ from: prevFrom, to: prevTo });
      let copied = 0;
      for (const s of prevSchedules) {
        try {
          const newDate = format(addDays(parseISO(s.date), 7), 'yyyy-MM-dd');
          await createSchedule({
            employeeId: s.employee.id,
            locationId: s.location.id,
            date: newDate,
            startTime: s.startTime,
            endTime: s.endTime,
            notes: s.notes ?? null,
          });
          copied++;
        } catch {
          // skip duplicates or conflicts silently
        }
      }
      if (copied > 0) fetchSchedules();
    } catch (err) {
      console.error(err);
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('schedules.deleteConfirm'))) return;
    await deleteSchedule(id);
    fetchSchedules();
  };

  const schedulesForDay = (day: Date) =>
    schedules.filter((s) => format(parseISO(s.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));

  if (loading) return <div style={{ padding: 40, color: '#888' }}>{t('common.loading')}</div>;

  return (
    <div>
      {showWizard && (
        <GenerarProposta
          onClose={() => setShowWizard(false)}
          onApplied={() => { setShowWizard(false); fetchSchedules(); }}
        />
      )}
      <Header
        title={t('schedules.title')}
        subtitle={t('schedules.subtitle')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.secondaryBtn} onClick={() => setShowWizard(true)}>
              {t('schedules.generateProposal')}
            </button>
            <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('schedules.cancel') : t('schedules.newShift')}
            </button>
          </div>
        }
      />

      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>{t('schedules.newShiftForm')}</h3>
          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.employee')}</label>
              <select style={styles.input} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">{t('schedules.selectEmployee')}</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.location')}</label>
              <select style={styles.input} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required>
                <option value="">{t('schedules.selectLocation')}</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.date')}</label>
              <input type="date" style={styles.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.startTime')}</label>
              <input type="time" style={styles.input} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.endTime')}</label>
              <input type="time" style={styles.input} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.notes')}</label>
              <input type="text" style={styles.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('schedules.optional')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" style={styles.primaryBtn}>{t('schedules.saveShift')}</button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.controls}>
        <div style={styles.weekNav}>
          <button style={styles.navBtn} onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
          <span style={styles.weekLabel}>
            {format(weekStart, 'd MMM', { locale: ca })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ca })}
          </span>
          <button style={styles.navBtn} onClick={() => setWeekStart(addDays(weekStart, 7))}>→</button>
          <button
            style={{ ...styles.copyBtn, opacity: copying ? 0.6 : 1 }}
            onClick={handleCopyPrevWeek}
            disabled={copying}
          >
            {copying ? t('schedules.copying') : t('schedules.copyPrevWeek')}
          </button>
        </div>
        <select
          style={styles.filterSelect}
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        >
          <option value="">{t('schedules.allLocations')}</option>
          {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as never, marginLeft: -2, marginRight: -2 }}>
      <div style={{ ...styles.weekGrid, minWidth: 560 }}>
        {weekDays.map((day, i) => {
          const daySchedules = schedulesForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          return (
            <div key={i} style={{ ...styles.dayCol, ...(isToday ? styles.dayColToday : {}) }}>
              <div style={styles.dayHeader}>
                <span style={styles.dayName}>{DAYS[i]}</span>
                <span style={{ ...styles.dayNum, ...(isToday ? styles.dayNumToday : {}) }}>
                  {format(day, 'd')}
                </span>
              </div>
              <div style={styles.dayBody}>
                {daySchedules.length === 0 ? (
                  <span style={styles.noShifts}>—</span>
                ) : (
                  daySchedules.map((s) => {
                    const c = empColorIdx(s.employee.name);
                    return (
                      <div key={s.id} style={{ ...styles.shiftChip, backgroundColor: c.bg, borderColor: c.border }}>
                        <span style={{ ...styles.shiftName, color: c.text }}>{s.employee.name.split(' ')[0]}</span>
                        <span style={styles.shiftTime}>{s.startTime}–{s.endTime}</span>
                        <span style={styles.shiftLoc}>{s.location.name.replace('The Commercial – ', '')}</span>
                        <button style={styles.deleteBtn} onClick={() => handleDelete(s.id)}>×</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  primaryBtn: { padding: '8px 16px', backgroundColor: '#2D3250', color: '#F4E285', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 16px', backgroundColor: '#fff', color: '#2D3250', border: '1.5px solid #E8E4D9', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, boxShadow: '0 1px 6px rgba(45,50,80,0.07)' },
  formTitle: { fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#2D3250' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280' },
  input: { padding: '8px 10px', border: '1.5px solid #E8E4D9', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#faf9f7' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  weekNav: { display: 'flex', alignItems: 'center', gap: 12 },
  navBtn: { padding: '7px 14px', border: '1.5px solid #E8E4D9', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#2D3250' },
  weekLabel: { fontSize: 14, fontWeight: 700, color: '#2D3250', minWidth: 170, textAlign: 'center' as const },
  copyBtn: { padding: '7px 13px', border: '1.5px solid #E8E4D9', borderRadius: 8, background: '#F5F3EC', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' as const },
  filterSelect: { padding: '7px 10px', border: '1.5px solid #E8E4D9', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff' },
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 },
  dayCol: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(45,50,80,0.06)' },
  dayColToday: { boxShadow: '0 0 0 2px #F4E285' },
  dayHeader: { padding: '10px 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #F5F3EC' },
  dayName: { fontSize: 10, textTransform: 'uppercase' as const, color: '#aaa', letterSpacing: '0.5px', fontWeight: 700 },
  dayNum: { fontSize: 20, fontWeight: 800, color: '#2D3250', marginTop: 2 },
  dayNumToday: { color: '#2D3250', backgroundColor: '#F4E285', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 },
  dayBody: { padding: '6px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 80 },
  noShifts: { fontSize: 12, color: '#ddd', textAlign: 'center' as const, marginTop: 12 },
  shiftChip: { borderRadius: 6, padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' as const, borderWidth: 1, borderStyle: 'solid' },
  shiftName: { fontSize: 11, fontWeight: 600 },
  shiftTime: { fontSize: 10, fontWeight: 600 },
  shiftLoc: { fontSize: 10, color: '#9CA3AF' },
  deleteBtn: { position: 'absolute' as const, top: 3, right: 4, background: 'transparent', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 },
};
