import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Field';
import { Segmented } from '../components/ui/Tabs';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Confirm';
import { useLocations, useSuppliers, useLocationMutations, useSupplierMutations } from '../hooks/queries';
import { useAuthStore, useCanManage } from '../store/authStore';
import { useTheme, type ThemePref } from '../hooks/useTheme';
import { LANGUAGES, type LangCode } from '../i18n';
import { DEMO } from '../api/client';
import { getErrorMessage } from '../lib/errors';
import type { Location, Supplier } from '../types';

export default function Configuracio() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const canManage = useCanManage();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'OWNER';
  const { pref, setPref } = useTheme();
  const locations = useLocations();
  const suppliers = useSuppliers();
  const locM = useLocationMutations();
  const supM = useSupplierMutations();

  const [locModal, setLocModal] = useState<{ open: boolean; editing?: Location | null }>({ open: false });
  const [locForm, setLocForm] = useState({ name: '', address: '' });
  const [supModal, setSupModal] = useState<{ open: boolean; editing?: Supplier | null }>({ open: false });
  const [supForm, setSupForm] = useState({ name: '', contact: '', email: '', phone: '' });
  const [err, setErr] = useState('');

  const openLoc = (editing?: Location) => { setErr(''); setLocForm({ name: editing?.name ?? '', address: editing?.address ?? '' }); setLocModal({ open: true, editing }); };
  const saveLoc = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const p = { name: locForm.name.trim(), address: locForm.address.trim() || null };
      if (locModal.editing) await locM.update.mutateAsync({ id: locModal.editing.id, p }); else await locM.create.mutateAsync(p);
      toast.success(t('settings.saved')); setLocModal({ open: false });
    } catch (x) { setErr(getErrorMessage(x)); }
  };
  const delLoc = async (l: Location) => {
    if (!(await confirm({ title: t('settings.deleteLocationTitle', { name: l.name }), message: t('settings.deleteLocationDesc'), danger: true, confirmLabel: t('common.delete') }))) return;
    try { await locM.remove.mutateAsync(l.id); toast.success(t('settings.deleted')); } catch (x) { toast.error(getErrorMessage(x)); }
  };

  const openSup = (editing?: Supplier) => { setErr(''); setSupForm({ name: editing?.name ?? '', contact: editing?.contact ?? '', email: editing?.email ?? '', phone: editing?.phone ?? '' }); setSupModal({ open: true, editing }); };
  const saveSup = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const p = { name: supForm.name.trim(), contact: supForm.contact.trim() || null, email: supForm.email.trim() || null, phone: supForm.phone.trim() || null };
      if (supModal.editing) await supM.update.mutateAsync({ id: supModal.editing.id, p }); else await supM.create.mutateAsync(p);
      toast.success(t('settings.saved')); setSupModal({ open: false });
    } catch (x) { setErr(getErrorMessage(x)); }
  };
  const delSup = async (s: Supplier) => {
    if (!(await confirm({ title: t('settings.deleteSupplierTitle', { name: s.name }), danger: true, confirmLabel: t('common.delete') }))) return;
    try { await supM.remove.mutateAsync(s.id); toast.success(t('settings.deleted')); } catch (x) { toast.error(getErrorMessage(x)); }
  };

  if (locations.isLoading || suppliers.isLoading) return <PageSkeleton />;

  const current = (i18n.language || 'de').slice(0, 2) as LangCode;

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid-main">
        <div className="col gap-5">
          <Card>
            <CardHead title={<span className="row gap-2"><Icon name="mapPin" size={16} />{t('settings.locations')}</span>} sub={t('settings.locationsSub')}
              action={canManage && <Button size="sm" variant="primary" icon="plus" onClick={() => openLoc()}>{t('settings.newLocation')}</Button>} />
            {locations.data?.length === 0 ? <EmptyState icon="mapPin" title={t('settings.noLocations')} /> : (
              <div className="list">
                {locations.data?.map((l) => (
                  <div key={l.id} className="list-item">
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="t-strong">{l.name}</span>
                      {l.address && <span className="t-sm t-3 t-truncate">{l.address}</span>}
                      <span className="row gap-2 mt-2"><Badge>{t('settings.employeesN', { n: l._count?.employees ?? 0 })}</Badge><Badge>{t('settings.shiftsN', { n: l._count?.schedules ?? 0 })}</Badge></span>
                    </div>
                    {canManage && (
                      <div className="row" style={{ gap: 2 }}>
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => openLoc(l)} aria-label={t('common.edit')} />
                        {isOwner && <Button size="sm" variant="ghost" icon="trash" onClick={() => delLoc(l)} aria-label={t('common.delete')} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHead title={<span className="row gap-2"><Icon name="truck" size={16} />{t('settings.suppliers')}</span>} sub={t('settings.suppliersSub')}
              action={canManage && <Button size="sm" variant="primary" icon="plus" onClick={() => openSup()}>{t('settings.newSupplier')}</Button>} />
            {suppliers.data?.length === 0 ? <EmptyState icon="truck" title={t('settings.noSuppliers')} /> : (
              <div className="list">
                {suppliers.data?.map((s) => (
                  <div key={s.id} className="list-item">
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="t-strong">{s.name}</span>
                      <span className="t-sm t-3 row-wrap" style={{ gap: 10 }}>
                        {s.contact && <span className="row gap-2"><Icon name="user" size={12} />{s.contact}</span>}
                        {s.email && <span className="row gap-2"><Icon name="mail" size={12} />{s.email}</span>}
                        {s.phone && <span className="row gap-2"><Icon name="phone" size={12} />{s.phone}</span>}
                      </span>
                    </div>
                    <div className="row gap-2">
                      <Badge>{t('settings.ordersN', { n: s._count?.orders ?? 0 })}</Badge>
                      {canManage && <><Button size="sm" variant="ghost" icon="edit" onClick={() => openSup(s)} aria-label={t('common.edit')} /><Button size="sm" variant="ghost" icon="trash" onClick={() => delSup(s)} aria-label={t('common.delete')} disabled={(s._count?.orders ?? 0) > 0} /></>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col gap-5">
          <Card>
            <CardHead title={<span className="row gap-2"><Icon name="user" size={16} />{t('settings.account')}</span>} />
            <div className="row gap-3 mb-4">
              <Avatar name={user?.email?.split('@')[0] ?? 'U'} id={user?.id} size={44} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span className="t-strong t-truncate">{user?.email}</span>
                <span className="row gap-2"><Badge tone="brand">{t(`roles.${user?.role ?? 'EMPLOYEE'}`)}</Badge>{user?.group?.plan && <Badge tone="accent">{user.group.plan}</Badge>}</span>
              </div>
            </div>
            <div className="list t-sm">
              <div className="list-item"><span className="t-3">{t('settings.group')}</span><span className="t-strong">{user?.group?.name ?? '—'}</span></div>
              <div className="list-item"><span className="t-3">{t('settings.mode')}</span><span className="t-strong">{DEMO ? t('common.demo') : t('settings.live')}</span></div>
            </div>
            {DEMO && <div className="notice notice-info mt-4"><Icon name="info" /><span>{t('common.demoHint')}</span></div>}
          </Card>

          <Card>
            <CardHead title={<span className="row gap-2"><Icon name="monitor" size={16} />{t('settings.appearance')}</span>} />
            <div className="col gap-4">
              <Field label={t('settings.theme')}>
                <Segmented<ThemePref> value={pref} onChange={setPref} items={[{ key: 'light', label: t('theme.light') }, { key: 'dark', label: t('theme.dark') }, { key: 'system', label: t('theme.system') }]} />
              </Field>
              <Field label={t('settings.language')}>
                <div className="row-wrap" style={{ gap: 6 }}>
                  {LANGUAGES.map((l) => <button key={l.code} className={`chip chip-btn${current === l.code ? ' chip-active' : ''}`} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</button>)}
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHead title={<span className="row gap-2"><Icon name="coffee" size={16} />{t('settings.about')}</span>} />
            <p className="t-sm t-2">{t('settings.aboutText')}</p>
            <p className="t-xs t-4 mt-3">Cafgic · Massiu Soft · v2.0</p>
          </Card>
        </div>
      </div>

      <Modal open={locModal.open} onClose={() => setLocModal({ open: false })} title={t(locModal.editing ? 'settings.editLocation' : 'settings.newLocation')}
        footer={<><Button variant="ghost" onClick={() => setLocModal({ open: false })}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="loc-form" icon="check" loading={locM.create.isPending || locM.update.isPending}>{t('common.save')}</Button></>}>
        <form id="loc-form" onSubmit={saveLoc} className="col gap-4">
          <Field label={t('settings.locationName')} required><Input value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} required autoFocus /></Field>
          <Field label={t('settings.address')}><Input value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} placeholder="Bahnhofstrasse 1, 8001 Zürich" /></Field>
          {err && <div className="error-box">{err}</div>}
        </form>
      </Modal>

      <Modal open={supModal.open} onClose={() => setSupModal({ open: false })} title={t(supModal.editing ? 'settings.editSupplier' : 'settings.newSupplier')}
        footer={<><Button variant="ghost" onClick={() => setSupModal({ open: false })}>{t('common.cancel')}</Button><Button variant="primary" type="submit" form="sup-form" icon="check" loading={supM.create.isPending || supM.update.isPending}>{t('common.save')}</Button></>}>
        <form id="sup-form" onSubmit={saveSup} className="col gap-4">
          <Field label={t('settings.supplierName')} required><Input value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} required autoFocus /></Field>
          <div className="form-grid">
            <Field label={t('settings.contact')}><Input value={supForm.contact} onChange={(e) => setSupForm({ ...supForm, contact: e.target.value })} /></Field>
            <Field label={t('employees.phone')}><Input value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} /></Field>
            <Field label={t('auth.email')} className="span-all"><Input type="email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} /></Field>
          </div>
          {err && <div className="error-box">{err}</div>}
        </form>
      </Modal>
    </div>
  );
}
