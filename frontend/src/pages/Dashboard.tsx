import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';
import { getLocations, getEmployees } from '../api/locations';
import { getSchedules } from '../api/schedules';
import { getOrders } from '../api/orders';
import { getCashClosings } from '../api/cashClosings';
import type { Location, Employee, Schedule, Order, CashClosing } from '../types';
import { format } from 'date-fns';

interface Stats {
  locations: Location[];
  employees: Employee[];
  todaySchedules: Schedule[];
  pendingOrders: Order[];
  lastClosing: CashClosing | null;
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.goodMorning';
  if (h < 20) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      getLocations(),
      getEmployees(),
      getSchedules({ from: today, to: today }),
      getOrders({ status: 'SENT' }),
      getCashClosings({ from: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'), to: today }),
    ])
      .then(([locations, employees, todaySchedules, pendingOrders, closings]) => {
        setStats({ locations, employees, todaySchedules, pendingOrders, lastClosing: closings[0] ?? null });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>{t('common.loading')}</div>;

  const firstName = user?.email?.split('@')[0] ?? t('common.owner');
  const diff = stats?.lastClosing
    ? Number(stats.lastClosing.closingAmount) - Number(stats.lastClosing.openingAmount) - Number(stats.lastClosing.sales) + Number(stats.lastClosing.expenses)
    : null;

  const schedulesByEmployee: Record<string, { employee: Schedule['employee']; schedules: Schedule[] }> = {};
  stats?.todaySchedules.forEach((s) => {
    if (!schedulesByEmployee[s.employee.id]) schedulesByEmployee[s.employee.id] = { employee: s.employee, schedules: [] };
    schedulesByEmployee[s.employee.id].schedules.push(s);
  });

  return (
    <div>
      <Header
        title={`${t(getGreetingKey())}, ${firstName}`}
        subtitle={new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      {/* Accions ràpides */}
      <div style={styles.actionsBar}>
        <button style={styles.actionBtn} onClick={() => navigate('/horaris')}>{t('dashboard.newShift')}</button>
        <button style={styles.actionBtn} onClick={() => navigate('/comandes')}>{t('dashboard.newOrder')}</button>
        <button style={styles.actionBtn} onClick={() => navigate('/caixa')}>{t('dashboard.closing')}</button>
      </div>

      {/* KPIs */}
      <div style={styles.statsGrid}>
        <StatCard label={t('dashboard.activeLocations')} value={stats?.locations.length ?? 0} />
        <StatCard label={t('dashboard.employees')} value={stats?.employees.length ?? 0} />
        <StatCard label={t('dashboard.todayShifts')} value={stats?.todaySchedules.length ?? 0} />
        <StatCard label={t('dashboard.sentOrders')} value={stats?.pendingOrders.length ?? 0} />
      </div>

      {/* Seccions */}
      <div style={styles.sectionsGrid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('dashboard.todayShiftsTitle')}</h2>
          {Object.keys(schedulesByEmployee).length === 0 ? (
            <p style={styles.empty}>{t('dashboard.noShifts')}</p>
          ) : (
            <div style={styles.list}>
              {Object.values(schedulesByEmployee).map(({ employee, schedules }) => {
                const rangeStart = schedules.map((s) => s.startTime).sort()[0];
                const ends = schedules.map((s) => s.endTime).sort();
                const rangeEnd = ends[ends.length - 1];
                return (
                  <div key={employee.id} style={styles.listItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={styles.miniAvatar}>{employee.name[0].toUpperCase()}</div>
                      <span style={styles.listName}>{employee.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {schedules.length > 1 && <span style={styles.countBadge}>{schedules.length}</span>}
                      <span style={styles.listMeta}>{rangeStart}–{rangeEnd}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('dashboard.sentOrdersTitle')}</h2>
          {stats?.pendingOrders.length === 0 ? (
            <p style={styles.empty}>{t('dashboard.noOrders')}</p>
          ) : (
            <div style={styles.list}>
              {stats?.pendingOrders.slice(0, 5).map((o) => (
                <div key={o.id} style={styles.listItem}>
                  <div>
                    <div style={styles.listName}>{o.supplier.name}</div>
                    <div style={styles.listMeta}>{o.location.name}</div>
                  </div>
                  <span style={styles.countBadge}>{o.items.length}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t('dashboard.lastClosing')}</h2>
          {!stats?.lastClosing ? (
            <p style={styles.empty}>{t('dashboard.noClosing')}</p>
          ) : (
            <div style={styles.closingCard}>
              <div style={styles.closingMeta}>
                <span style={styles.closingLocation}>{stats.lastClosing.location.name}</span>
                <span style={styles.listMeta}>{format(new Date(stats.lastClosing.date), 'd MMM yyyy')}</span>
              </div>
              <div style={styles.closingFigures}>
                <div style={styles.closingFigure}>
                  <span style={styles.closingValue}>CHF {Number(stats.lastClosing.sales).toFixed(2)}</span>
                  <span style={styles.closingLabel}>{t('dashboard.sales')}</span>
                </div>
                <div style={styles.closingDivider} />
                <div style={styles.closingFigure}>
                  <span style={{ ...styles.closingValue, color: diff !== null ? (diff >= 0 ? '#5aab7a' : '#c0392b') : '#2D3250' }}>
                    {diff !== null ? `${diff >= 0 ? '+' : ''}CHF ${diff.toFixed(2)}` : '—'}
                  </span>
                  <span style={styles.closingLabel}>{t('dashboard.difference')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, color: '#6B7280', fontSize: 14 },
  actionsBar: { display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' },
  actionBtn: {
    padding: '8px 16px', backgroundColor: '#2D3250', color: '#F4E285',
    border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 28 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: '20px 18px',
    display: 'flex', flexDirection: 'column', gap: 4,
    boxShadow: '0 1px 3px rgba(45,50,80,0.06)',
    borderLeft: '3px solid #F4E285',
  },
  statValue: { fontSize: 30, fontWeight: 800, color: '#2D3250', lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  sectionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(45,50,80,0.06)' },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.6px' },
  empty: { fontSize: 13, color: '#C4BFB8', margin: 0 },
  list: { display: 'flex', flexDirection: 'column' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F5F3EC' },
  listName: { fontSize: 13, fontWeight: 600, color: '#2D3250' },
  listMeta: { fontSize: 12, color: '#9CA3AF' },
  miniAvatar: {
    width: 26, height: 26, borderRadius: '50%', backgroundColor: '#E8E4D9',
    color: '#2D3250', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  countBadge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F5F3EC',
    color: '#6B7280', fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
  },
  closingCard: { display: 'flex', flexDirection: 'column', gap: 12 },
  closingMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closingLocation: { fontSize: 13, fontWeight: 700, color: '#2D3250' },
  closingFigures: { display: 'flex', backgroundColor: '#F5F3EC', borderRadius: 8, overflow: 'hidden' },
  closingFigure: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 14px' },
  closingDivider: { width: 1, backgroundColor: '#E8E4D9', flexShrink: 0 },
  closingValue: { fontSize: 17, fontWeight: 800, color: '#2D3250', lineHeight: 1 },
  closingLabel: { fontSize: 11, color: '#9CA3AF' },
};
