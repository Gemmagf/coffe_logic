import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import {
  getCashAnalytics,
  getOrdersAnalytics,
  getStaffingAnalytics,
  type CashAnalytics,
  type OrdersAnalytics,
  type StaffingAnalytics,
} from '../api/analytics';
import { createOrder } from '../api/orders';
import client from '../api/client';

// ─── Mini Bar Chart (CSS only) ────────────────────────────────────────────────

function BarChart({
  data,
  valueKey,
  labelKey,
  color = '#4f7bdb',
  unit = 'CHF',
  secondaryKey,
  secondaryColor = '#10b981',
}: {
  data: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  unit?: string;
  secondaryKey?: string;
  secondaryColor?: string;
}) {
  const vals = data.map((d) => Number(d[valueKey]));
  const secVals = secondaryKey ? data.map((d) => Number(d[secondaryKey])) : [];
  const maxVal = Math.max(...vals, ...secVals, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 2 }}>
          <span style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap' }}>
            {unit} {vals[i].toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
            <div
              style={{
                width: secondaryKey ? '45%' : '70%',
                height: Math.max(4, (vals[i] / maxVal) * 88),
                backgroundColor: color,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s',
              }}
            />
            {secondaryKey && (
              <div
                style={{
                  width: '45%',
                  height: Math.max(4, (secVals[i] / maxVal) * 88),
                  backgroundColor: secondaryColor,
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.75,
                  transition: 'height 0.3s',
                }}
              />
            )}
          </div>
          <span style={{ fontSize: 9, color: '#aaa', marginTop: 2, whiteSpace: 'nowrap' }}>
            {String(d[labelKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Planificacio() {
  const { t } = useTranslation();
  const [cash, setCash] = useState<CashAnalytics | null>(null);
  const [orders, setOrders] = useState<OrdersAnalytics | null>(null);
  const [staffing, setStaffing] = useState<StaffingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'caixa' | 'comandes' | 'torns'>('caixa');

  // Quick-order state
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [orderingFor, setOrderingFor] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      getCashAnalytics(),
      getOrdersAnalytics(),
      getStaffingAnalytics(),
      client.get('/locations').then((r) => r.data.data),
    ])
      .then(([c, o, s, locs]) => {
        setCash(c);
        setOrders(o);
        setStaffing(s);
        setLocations(locs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleQuickOrder = async (supplierId: string, supplierName: string) => {
    if (!selectedLocation) { alert(t('orders.selectLocation')); return; }
    const suggestions = orders?.suggestions.filter((s) => s.supplierId === supplierId) ?? [];
    if (suggestions.length === 0) return;

    try {
      await createOrder({
        supplierId,
        locationId: selectedLocation,
        items: suggestions.map((s) => ({
          productName: s.productName,
          quantity: s.suggestedQty,
          unit: s.unit,
          unitPrice: 0,
        })),
        notes: `Comanda automàtica per previsió — ${new Date().toLocaleDateString('ca')}`,
        deliveryAt: null,
      });
      setOrderSuccess(`Comanda creada per ${supplierName}`);
      setOrderingFor(null);
      setTimeout(() => setOrderSuccess(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#888' }}>{t('common.loading')}</div>;

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'caixa', label: t('planning.tabCash') },
    { key: 'comandes', label: t('planning.tabOrders') },
    { key: 'torns', label: t('planning.tabShifts') },
  ];

  return (
    <div>
      <Header
        title={t('planning.title')}
        subtitle={t('planning.subtitle')}
      />

      {/* Tabs */}
      <div style={styles.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            style={{ ...styles.tab, ...(activeTab === t.key ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CAIXA TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'caixa' && (
        <div style={styles.tabContent}>
          {!cash?.summary ? (
            <p style={styles.empty}>{t('planning.noData')}</p>
          ) : (
            <>
              {/* KPIs */}
              <div style={styles.kpiRow}>
                <Kpi label={t('planning.totalSales')} value={`CHF ${cash.summary.totalSales.toLocaleString()}`} />
                <Kpi label={t('planning.dailyAvg')} value={`CHF ${cash.summary.avgDailySales.toLocaleString()}`} />
                <Kpi label={t('planning.totalExpenses')} value={`CHF ${cash.summary.totalExpenses.toLocaleString()}`} color="#dc2626" />
                <Kpi label={t('planning.bestDay')} value={cash.summary.bestDay.label} sub={`CHF ${cash.summary.bestDay.avg.toLocaleString()} de mitjana`} />
                <Kpi label={t('planning.worstDay')} value={cash.summary.worstDay.label} sub={`CHF ${cash.summary.worstDay.avg.toLocaleString()} de mitjana`} color="#f59e0b" />
              </div>

              <div style={styles.chartsGrid}>
                {/* Tendència setmanal */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>{t('planning.weeklyTrend')}</h3>
                  {cash.trend.length === 0 ? (
                    <p style={styles.empty}>{t('planning.noSalesData')}</p>
                  ) : (
                    <>
                      <div style={styles.legend}>
                        <span style={{ ...styles.legendDot, background: '#4f7bdb' }} /> {t('planning.totalSales')}
                        <span style={{ ...styles.legendDot, background: '#10b981', marginLeft: 16 }} /> Net
                      </div>
                      <BarChart
                        data={cash.trend as unknown as Record<string, unknown>[]}
                        valueKey="sales"
                        labelKey="week"
                        color="#4f7bdb"
                        secondaryKey="net"
                        secondaryColor="#10b981"
                      />
                    </>
                  )}
                </div>

                {/* Previsió propera setmana */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>{t('planning.forecastWeek')}</h3>
                  {cash.forecast.every((f) => f.predicted === 0) ? (
                    <p style={styles.empty}>{t('planning.noSalesData')}</p>
                  ) : (
                    <>
                      <p style={styles.cardSub}>{t('planning.forecastBasis')}</p>
                      <BarChart
                        data={cash.forecast as unknown as Record<string, unknown>[]}
                        valueKey="predicted"
                        labelKey="label"
                        color="#F4E285"
                      />
                      <div style={styles.forecastList}>
                        {cash.forecast.map((f) => (
                          <div key={f.date} style={styles.forecastRow}>
                            <span style={styles.forecastDate}>{f.date.slice(5)} {f.label}</span>
                            <span style={styles.forecastVal}>CHF {f.predicted.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Mitjana per dia de la setmana */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>{t('planning.salesByDay')}</h3>
                  {cash.byDayOfWeek.length === 0 ? (
                    <p style={styles.empty}>{t('planning.noSalesData')}</p>
                  ) : (
                    <BarChart
                      data={cash.byDayOfWeek as unknown as Record<string, unknown>[]}
                      valueKey="avg"
                      labelKey="label"
                      color="#E8A838"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COMANDES TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'comandes' && (
        <div style={styles.tabContent}>
          {orderSuccess && <div style={styles.successBanner}>{orderSuccess}</div>}

          {(!orders || orders.topProducts.length === 0) ? (
            <p style={styles.empty}>{t('planning.noOrderHistory')}</p>
          ) : (
            <div style={styles.chartsGrid}>
              {/* Suggeriments urgents */}
              <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                <h3 style={styles.cardTitle}>{t('planning.pendingOrders')}</h3>
                {orders.suggestions.length === 0 ? (
                  <p style={styles.empty}>{t('planning.allUpToDate')}</p>
                ) : (
                  <>
                    <p style={styles.cardSub}>{t('orders.overdueSubtitle')}</p>
                    <div style={styles.quickOrderBar}>
                      <span style={styles.label}>{t('planning.quickOrderLocation')}</span>
                      <select
                        style={styles.filterSelect}
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                      >
                        <option value="">{t('orders.selectLocation')}</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>

                    {/* Agrupar suggeriments per proveïdor */}
                    {Array.from(new Set(orders.suggestions.map((s) => s.supplierId))).map((supId) => {
                      const supSuggestions = orders.suggestions.filter((s) => s.supplierId === supId);
                      const supName = supSuggestions[0].supplierName;
                      const sup = orders.supplierFrequency.find((sf) => sf.supplierId === supId);
                      return (
                        <div key={supId} style={styles.suggestionBlock}>
                          <div style={styles.suggestionHeader}>
                            <div>
                              <span style={styles.supplierBadge}>{supName}</span>
                              {sup && (
                                <span style={styles.overdueTag}>
                                  Fa {sup.daysSinceLast} dies · interval habitual {sup.avgIntervalDays}d
                                </span>
                              )}
                            </div>
                            {orderingFor === supId ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button style={styles.confirmBtn} onClick={() => handleQuickOrder(supId, supName)}>
                                  {t('planning.confirmOrder')}
                                </button>
                                <button style={styles.cancelBtn} onClick={() => setOrderingFor(null)}>
                                  {t('planning.cancelOrder')}
                                </button>
                              </div>
                            ) : (
                              <button style={styles.quickOrderBtn} onClick={() => setOrderingFor(supId)}>
                                {t('orders.quickOrder')}
                              </button>
                            )}
                          </div>
                          <div style={styles.suggestionItems}>
                            {supSuggestions.map((s, i) => (
                              <span key={i} style={styles.suggestionChip}>
                                {s.productName} · {s.suggestedQty} {s.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Top productes */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>{t('planning.top10Products')}</h3>
                <div style={styles.productTable}>
                  {orders.topProducts.map((p, i) => (
                    <div key={i} style={styles.productRow}>
                      <span style={styles.productRank}>#{i + 1}</span>
                      <div style={styles.productInfo}>
                        <span style={styles.productName}>{p.name}</span>
                        <span style={styles.productSup}>{p.supplierName}</span>
                      </div>
                      <div style={styles.productStats}>
                        <span style={styles.statBadge}>{p.count} comandes</span>
                        <span style={styles.statBadge}>Mitjana: {p.avgQty} {p.lastUnit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Freqüència per proveïdor */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>{t('planning.supplierFrequency')}</h3>
                <div style={styles.productTable}>
                  {orders.supplierFrequency.map((s) => (
                    <div key={s.supplierId} style={styles.productRow}>
                      <div style={styles.productInfo}>
                        <span style={styles.productName}>{s.supplierName}</span>
                        <span style={styles.productSup}>
                          Última: fa {s.daysSinceLast}d · interval habitual: {s.avgIntervalDays > 0 ? `${s.avgIntervalDays}d` : '—'}
                        </span>
                      </div>
                      <div style={styles.productStats}>
                        <span style={styles.statBadge}>{s.totalOrders} comandes</span>
                        {s.overdue && <span style={styles.overdueChip}>Pendent</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TORNS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'torns' && (
        <div style={styles.tabContent}>
          {!staffing ? (
            <p style={styles.empty}>{t('planning.noSalesData')}</p>
          ) : (
            <>
              <div style={styles.kpiRow}>
                <Kpi label={t('planning.activeLocations')} value={String(staffing.totalLocations)} />
                <Kpi label={t('planning.employees')} value={String(staffing.totalEmployees)} />
                <Kpi label={t('planning.coveredDays')} value={String(staffing.coveredDays)} color="#059669" />
                <Kpi label={t('planning.uncoveredDays')} value={String(staffing.uncoveredDays)} color={staffing.uncoveredDays > 0 ? '#dc2626' : '#059669'} />
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>{t('planning.shiftCoverage')}</h3>
                <p style={styles.cardSub}>
                  {t('planning.coverageDesc')} ({staffing.totalLocations} {staffing.totalLocations !== 1 ? t('planning.location_plural') : t('planning.location_singular')})
                </p>
                <div style={styles.coverageGrid}>
                  {staffing.coverage.map((day) => (
                    <div
                      key={day.date}
                      style={{
                        ...styles.coverageCell,
                        backgroundColor: day.covered ? '#d1fae5' : day.shifts > 0 ? '#fef3c7' : '#fee2e2',
                        borderColor: day.covered ? '#6ee7b7' : day.shifts > 0 ? '#fbbf24' : '#fca5a5',
                      }}
                    >
                      <span style={styles.coverageDayLabel}>{day.dayLabel}</span>
                      <span style={styles.coverageDate}>{day.date.slice(5)}</span>
                      <span style={styles.coverageShifts}>
                        {day.shifts === 0 ? '—' : `${day.shifts} torn${day.shifts !== 1 ? 's' : ''}`}
                      </span>
                      {day.employees.length > 0 && (
                        <div style={styles.coverageEmps}>
                          {day.employees.slice(0, 2).map((e, i) => (
                            <span key={i} style={styles.empChip}>{e.split(' ')[0]}</span>
                          ))}
                          {day.employees.length > 2 && (
                            <span style={styles.empChip}>+{day.employees.length - 2}</span>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: 9, marginTop: 4, fontWeight: 700, color: day.covered ? '#059669' : day.shifts > 0 ? '#d97706' : '#dc2626' }}>
                        {day.covered ? 'OK' : day.shifts > 0 ? '!' : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={styles.coverageLegend}>
                  <span style={{ ...styles.legendItem, color: '#059669' }}>{t('planning.legend_covered')}</span>
                  <span style={{ ...styles.legendItem, color: '#d97706' }}>{t('planning.legend_partial')}</span>
                  <span style={{ ...styles.legendItem, color: '#dc2626' }}>{t('planning.legend_uncovered')}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Kpi Card ─────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, color = '#2D3250' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={kpiStyles.card}>
      <span style={kpiStyles.label}>{label}</span>
      <span style={{ ...kpiStyles.value, color }}>{value}</span>
      {sub && <span style={kpiStyles.sub}>{sub}</span>}
    </div>
  );
}

const kpiStyles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#fff', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 140 },
  label: { fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 },
  value: { fontSize: 22, fontWeight: 700, display: 'block' },
  sub: { fontSize: 11, color: '#aaa', display: 'block', marginTop: 2 },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  tabBar: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  tab: { padding: '9px 18px', borderRadius: 8, border: '1.5px solid #ddd', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' },
  tabActive: { backgroundColor: '#2D3250', color: '#fff', borderColor: '#2D3250' },
  tabContent: {},
  kpiRow: { display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#2D3250', margin: '0 0 4px' },
  cardSub: { fontSize: 11, color: '#aaa', margin: '0 0 12px' },
  legend: { display: 'flex', alignItems: 'center', fontSize: 11, color: '#888', marginBottom: 8 },
  legendDot: { display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 4 },
  forecastList: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  forecastRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #f5f5f5' },
  forecastDate: { color: '#555' },
  forecastVal: { fontWeight: 700, color: '#4f7bdb' },
  empty: { color: '#aaa', fontSize: 13 },
  successBanner: { backgroundColor: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 600, fontSize: 13 },
  quickOrderBar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 0' },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  filterSelect: { padding: '7px 10px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none' },
  suggestionBlock: { border: '1.5px solid #fee2e2', borderRadius: 10, padding: '12px 16px', marginBottom: 12, backgroundColor: '#fff5f5' },
  suggestionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  supplierBadge: { fontWeight: 700, fontSize: 13, color: '#2D3250', display: 'block' },
  overdueTag: { fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' },
  suggestionItems: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  suggestionChip: { fontSize: 11, backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: 20, padding: '3px 10px', color: '#555' },
  quickOrderBtn: { padding: '6px 14px', border: '1.5px solid #4f7bdb', borderRadius: 6, background: 'transparent', color: '#4f7bdb', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  confirmBtn: { padding: '6px 14px', border: 'none', borderRadius: 6, background: '#4f7bdb', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '6px 14px', border: '1.5px solid #ddd', borderRadius: 6, background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer' },
  productTable: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  productRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' },
  productRank: { fontSize: 12, fontWeight: 700, color: '#aaa', width: 24, flexShrink: 0 },
  productInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  productName: { fontSize: 13, fontWeight: 600, color: '#2D3250' },
  productSup: { fontSize: 11, color: '#888' },
  productStats: { display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' },
  statBadge: { fontSize: 10, backgroundColor: '#f0f0f8', borderRadius: 10, padding: '2px 8px', color: '#555', whiteSpace: 'nowrap' },
  overdueChip: { fontSize: 10, backgroundColor: '#fee2e2', borderRadius: 10, padding: '2px 8px', color: '#dc2626', fontWeight: 700 },
  coverageGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 12 },
  coverageCell: { borderRadius: 8, borderWidth: '1.5px', borderStyle: 'solid', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  coverageDayLabel: { fontSize: 11, fontWeight: 700, color: '#555' },
  coverageDate: { fontSize: 10, color: '#888' },
  coverageShifts: { fontSize: 11, fontWeight: 600, color: '#333', marginTop: 4 },
  coverageEmps: { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' },
  empChip: { fontSize: 9, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: '1px 5px', color: '#555' },
  coverageLegend: { display: 'flex', gap: 16, marginTop: 14, fontSize: 12 },
  legendItem: { fontWeight: 600 },
};
