import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import { getCashClosings, createCashClosing } from '../api/cashClosings';
import { getCashAnalytics, type CashAnalytics } from '../api/analytics';
import { getLocations } from '../api/locations';
import type { CashClosing, Location } from '../types';

// ─── Mini Bar Chart (CSS) ─────────────────────────────────────────────────────

function BarChart({
  data,
  valueKey,
  labelKey,
  color = '#4f7bdb',
  unit = 'CHF',
}: {
  data: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  unit?: string;
}) {
  const vals = data.map((d) => Number(d[valueKey]));
  const maxVal = Math.max(...vals, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 2 }}>
          <span style={{ fontSize: 8, color: '#aaa', whiteSpace: 'nowrap' }}>
            {unit} {vals[i].toLocaleString()}
          </span>
          <div style={{ width: '60%', height: Math.max(4, (vals[i] / maxVal) * 75), backgroundColor: color, borderRadius: '3px 3px 0 0' }} />
          <span style={{ fontSize: 8, color: '#bbb', whiteSpace: 'nowrap' }}>{String(d[labelKey])}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Caixa() {
  const { t } = useTranslation();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [analytics, setAnalytics] = useState<CashAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const emptyForm = () => ({
    locationId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    openingAmount: 0,
    closingAmount: 0,
    sales: 0,
    cardSales: 0,
    cashSales: 0,
    expenses: 0,
    notes: '',
  });

  const [form, setForm] = useState(emptyForm());

  const fetchClosings = () => {
    getCashClosings({ ...(filterLocation ? { locationId: filterLocation } : {}) })
      .then(setClosings)
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      getLocations(),
      getCashAnalytics(),
    ])
      .then(([locs, anal]) => {
        setLocations(locs);
        setAnalytics(anal);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClosings(); }, [filterLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await createCashClosing(form);
      setShowForm(false);
      setForm(emptyForm());
      fetchClosings();
      // Refresca analytics
      getCashAnalytics(filterLocation || undefined).then(setAnalytics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en guardar el tancament';
      setSubmitError(msg);
    }
  };

  const numField = (key: keyof typeof form, label: string) => (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputWrapper}>
        <span style={styles.currency}>CHF</span>
        <input
          type="number"
          step="0.01"
          min="0"
          style={styles.inputCurrency}
          value={(form[key] as number)}
          onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>
    </div>
  );

  const difference = (c: CashClosing) =>
    Number(c.closingAmount) - Number(c.openingAmount) - Number(c.sales) + Number(c.expenses);

  if (loading) return <div style={{ padding: 40, color: '#888' }}>{t('common.loading')}</div>;

  return (
    <div>
      <Header
        title={t('cash.title')}
        subtitle={t('cash.subtitle')}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {analytics?.summary && (
              <button
                style={{ ...styles.analyticsBtn, ...(showAnalytics ? styles.analyticsBtnActive : {}) }}
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {t('cash.trends')}
              </button>
            )}
            <button style={styles.primaryBtn} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('cash.cancel') : t('cash.newClosing')}
            </button>
          </div>
        }
      />

      {/* ── Panell d'anàlisi ─────────────────────────────────────────────── */}
      {showAnalytics && analytics?.summary && (
        <div style={styles.analyticsPanel}>
          <div style={styles.analyticsPanelHead}>
            <span style={styles.analyticsPanelTitle}>{t('cash.salesAnalysis')}</span>
            <span style={styles.analyticsPanelSub}>{t('cash.basedOn', { n: analytics.summary.totalClosings })}</span>
          </div>

          {/* KPIs ràpids */}
          <div style={styles.kpiRow}>
            <div style={styles.kpi}>
              <span style={styles.kpiLabel}>{t('cash.totalSales')}</span>
              <span style={styles.kpiVal}>CHF {analytics.summary.totalSales.toLocaleString()}</span>
            </div>
            <div style={styles.kpi}>
              <span style={styles.kpiLabel}>{t('cash.dailyAvg')}</span>
              <span style={styles.kpiVal}>CHF {analytics.summary.avgDailySales.toLocaleString()}</span>
            </div>
            <div style={styles.kpi}>
              <span style={styles.kpiLabel}>{t('cash.bestDay')}</span>
              <span style={{ ...styles.kpiVal, color: '#5aab7a' }}>{analytics.summary.bestDay.label}</span>
              <span style={styles.kpiSub}>{t('cash.avgOf', { n: analytics.summary.bestDay.avg.toLocaleString() })}</span>
            </div>
            <div style={styles.kpi}>
              <span style={styles.kpiLabel}>{t('cash.worstDay')}</span>
              <span style={{ ...styles.kpiVal, color: '#E8A838' }}>{analytics.summary.worstDay.label}</span>
              <span style={styles.kpiSub}>{t('cash.avgOf', { n: analytics.summary.worstDay.avg.toLocaleString() })}</span>
            </div>
          </div>

          <div style={styles.chartsRow}>
            {/* Tendència setmanal */}
            {analytics.trend.length > 0 && (
              <div style={styles.chartCard}>
                <span style={styles.chartTitle}>{t('cash.weeklyTrend')}</span>
                <BarChart
                  data={analytics.trend as unknown as Record<string, unknown>[]}
                  valueKey="sales"
                  labelKey="week"
                  color="#4f7bdb"
                />
              </div>
            )}

            {/* Per dia de la setmana */}
            {analytics.byDayOfWeek.length > 0 && (
              <div style={styles.chartCard}>
                <span style={styles.chartTitle}>{t('cash.avgPerDay')}</span>
                <BarChart
                  data={analytics.byDayOfWeek as unknown as Record<string, unknown>[]}
                  valueKey="avg"
                  labelKey="label"
                  color="#F4E285"
                />
              </div>
            )}

            {/* Previsió propera setmana */}
            <div style={styles.chartCard}>
              <span style={styles.chartTitle}>{t('cash.forecast7')}</span>
              {analytics.forecast.every((f) => f.predicted === 0) ? (
                <p style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>{t('cash.noHistory')}</p>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {analytics.forecast.map((f) => (
                    <div key={f.date} style={styles.forecastRow}>
                      <span style={styles.forecastDate}>{f.date.slice(5)} <span style={{ color: '#bbb' }}>{f.label}</span></span>
                      <span style={styles.forecastVal}>CHF {f.predicted.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Formulari nou tancament ──────────────────────────────────────── */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>{t('cash.closingDay')}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>{t('cash.location')}</label>
                <select style={styles.input} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required>
                  <option value="">{t('cash.selectLocation')}</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('cash.date')}</label>
                <input type="date" style={styles.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>

            <div style={styles.formGrid}>
              {numField('openingAmount', t('cash.openingAmount'))}
              {numField('closingAmount', t('cash.closingAmount'))}
              {numField('sales', t('cash.totalSalesField'))}
              {numField('cardSales', t('cash.cardSales'))}
              {numField('cashSales', t('cash.cashSales'))}
              {numField('expenses', t('cash.expenses'))}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('schedules.notes')}</label>
              <textarea
                style={{ ...styles.input, minHeight: 72, resize: 'vertical' }}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('cash.notesPlaceholder')}
              />
            </div>

            {submitError && <p style={styles.error}>{submitError}</p>}
            <button type="submit" style={styles.primaryBtn}>{t('cash.saveClosing')}</button>
          </form>
        </div>
      )}

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div style={styles.filters}>
        <select style={styles.filterSelect} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">{t('cash.allLocations')}</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* ── Taula tancaments ─────────────────────────────────────────────── */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>{t('cash.date_col')}</span>
          <span>{t('cash.location_col')}</span>
          <span>{t('cash.opening')}</span>
          <span>{t('cash.closing')}</span>
          <span>{t('cash.sales_col')}</span>
          <span>{t('cash.expenses_col')}</span>
          <span>{t('cash.difference')}</span>
        </div>
        {closings.length === 0 ? (
          <p style={styles.empty}>{t('cash.noClosings')}</p>
        ) : (
          closings.map((c) => {
            const diff = difference(c);
            return (
              <div key={c.id} style={styles.tableRow}>
                <span>{format(new Date(c.date), 'd MMM yyyy')}</span>
                <span>{c.location.name}</span>
                <span>CHF {Number(c.openingAmount).toFixed(2)}</span>
                <span>CHF {Number(c.closingAmount).toFixed(2)}</span>
                <span style={{ fontWeight: 600 }}>CHF {Number(c.sales).toFixed(2)}</span>
                <span>CHF {Number(c.expenses).toFixed(2)}</span>
                <span style={{ fontWeight: 700, color: diff >= 0 ? '#5aab7a' : '#c0392b' }}>
                  {diff >= 0 ? '+' : ''}CHF {diff.toFixed(2)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  primaryBtn: { padding: '9px 18px', backgroundColor: '#2D3250', color: '#F4E285', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  analyticsBtn: { padding: '8px 14px', backgroundColor: '#fff', color: '#2D3250', border: '1.5px solid #e2ddd5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  analyticsBtnActive: { backgroundColor: '#F4E285', borderColor: '#F4E285' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 6px rgba(45,50,80,0.07)' },
  formTitle: { fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#2D3250' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 600, color: '#666' },
  input: { padding: '8px 10px', border: '1.5px solid #e2ddd5', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#faf9f7' },
  inputWrapper: { display: 'flex', alignItems: 'center', border: '1.5px solid #e2ddd5', borderRadius: 6, overflow: 'hidden' },
  currency: { padding: '8px 8px', backgroundColor: '#F5F3EC', fontSize: 12, color: '#888', borderRight: '1px solid #e2ddd5' },
  inputCurrency: { padding: '8px 10px', border: 'none', fontSize: 13, outline: 'none', flex: 1, width: 0, backgroundColor: '#faf9f7' },
  error: { fontSize: 13, color: '#c0392b', margin: '0 0 12px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' },
  filters: { display: 'flex', gap: 12, marginBottom: 20 },
  filterSelect: { padding: '7px 10px', border: '1.5px solid #e2ddd5', borderRadius: 6, fontSize: 13, outline: 'none', backgroundColor: '#fff' },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(45,50,80,0.06)' },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr repeat(5, 110px)',
    padding: '12px 20px',
    backgroundColor: '#F5F3EC',
    fontSize: 11,
    fontWeight: 700,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #eee',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr repeat(5, 110px)',
    padding: '14px 20px',
    fontSize: 13,
    color: '#333',
    borderBottom: '1px solid #f5f2ec',
    alignItems: 'center',
  },
  empty: { padding: '24px 20px', color: '#bbb', fontSize: 13, margin: 0 },
  // Analytics panel
  analyticsPanel: { backgroundColor: '#fffbea', border: '1.5px solid #F4E285', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
  analyticsPanelHead: { marginBottom: 14 },
  analyticsPanelTitle: { fontSize: 14, fontWeight: 700, color: '#2D3250', display: 'block' },
  analyticsPanelSub: { fontSize: 11, color: '#a08a00', display: 'block', marginTop: 2 },
  kpiRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  kpi: { backgroundColor: '#fff', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 },
  kpiLabel: { fontSize: 10, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.4px' },
  kpiVal: { fontSize: 18, fontWeight: 700, color: '#2D3250' },
  kpiSub: { fontSize: 10, color: '#bbb' },
  chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  chartCard: { backgroundColor: '#fff', borderRadius: 8, padding: '12px 14px' },
  chartTitle: { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.4px' },
  forecastRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid #f5f2ec' },
  forecastDate: { color: '#555', fontWeight: 600 },
  forecastVal: { fontWeight: 700, color: '#4f7bdb' },
};
