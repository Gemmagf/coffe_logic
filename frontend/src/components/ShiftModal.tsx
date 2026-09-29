import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Field, Input, Select } from './ui/Field';
import { useToast } from './ui/Toast';
import { useConfirm } from './ui/Confirm';
import { useScheduleMutations } from '../hooks/queries';
import { getErrorMessage } from '../lib/errors';
import { fmtHours, hoursBetween } from '../lib/format';
import type { Employee, Location, Schedule } from '../types';

export interface ShiftDraft { date: string; employeeId?: string; locationId?: string; startTime?: string; endTime?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  locations: Location[];
  editing?: Schedule | null;
  draft?: ShiftDraft | null;
}

const PRESETS = [
  { key: 'morning', start: '07:00', end: '15:00' },
  { key: 'midday', start: '11:00', end: '19:00' },
  { key: 'evening', start: '15:00', end: '23:00' },
];

export default function ShiftModal({ open, onClose, employees, locations, editing, draft }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const { create, update, remove } = useScheduleMutations();
  const [form, setForm] = useState({ employeeId: '', locationId: '', date: '', startTime: '09:00', endTime: '17:00', notes: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setForm({ employeeId: editing.employeeId, locationId: editing.locationId, date: editing.date, startTime: editing.startTime, endTime: editing.endTime, notes: editing.notes ?? '' });
    } else {
      setForm({
        employeeId: draft?.employeeId ?? '', locationId: draft?.locationId ?? (locations.length === 1 ? locations[0].id : ''),
        date: draft?.date ?? new Date().toISOString().slice(0, 10), startTime: draft?.startTime ?? '09:00', endTime: draft?.endTime ?? '17:00', notes: '',
      });
    }
  }, [open, editing, draft, locations]);

  const hours = hoursBetween(form.startTime, form.endTime);
  const invalidTime = form.startTime >= form.endTime;
  const busy = create.isPending || update.isPending || remove.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (invalidTime) { setError(t('schedules.invalidTime')); return; }
    try {
      const payload = { ...form, notes: form.notes || null };
      if (editing) await update.mutateAsync({ id: editing.id, p: payload });
      else await create.mutateAsync(payload);
      toast.success(t(editing ? 'schedules.updated' : 'schedules.created'));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!(await confirm({ title: t('schedules.deleteConfirm'), danger: true, confirmLabel: t('common.delete') }))) return;
    try {
      await remove.mutateAsync(editing.id);
      toast.success(t('schedules.deleted'));
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const employee = employees.find((e) => e.id === form.employeeId);
  const suggestedLocs = employee?.locations?.map((l) => l.locationId) ?? [];

  return (
    <Modal open={open} onClose={onClose} title={t(editing ? 'schedules.editShift' : 'schedules.newShiftForm')}
      description={editing ? `${editing.employee.name} · ${editing.location.name}` : undefined}
      footer={
        <>
          {editing && <Button variant="danger-outline" icon="trash" onClick={handleDelete} disabled={busy} style={{ marginRight: 'auto' }}>{t('common.delete')}</Button>}
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="shift-form" loading={busy} icon="check">{t(editing ? 'common.save' : 'schedules.saveShift')}</Button>
        </>
      }
    >
      <form id="shift-form" onSubmit={submit} className="col gap-4">
        <div className="form-grid">
          <Field label={t('schedules.employee')} required>
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required autoFocus>
              <option value="">{t('schedules.selectEmployee')}</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </Select>
          </Field>
          <Field label={t('schedules.location')} required hint={suggestedLocs.length && form.locationId && !suggestedLocs.includes(form.locationId) ? t('schedules.notUsualLocation') : undefined}>
            <Select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} required>
              <option value="">{t('schedules.selectLocation')}</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}{suggestedLocs.includes(loc.id) ? ' ★' : ''}</option>)}
            </Select>
          </Field>
          <Field label={t('schedules.date')} required>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          <Field label={t('schedules.startTime')} required>
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required invalid={invalidTime} />
          </Field>
          <Field label={t('schedules.endTime')} required hint={!invalidTime ? fmtHours(hours) : undefined} error={invalidTime ? t('schedules.invalidTime') : undefined}>
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required invalid={invalidTime} />
          </Field>
          <Field label={t('schedules.notes')}>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('schedules.optional')} />
          </Field>
        </div>
        <div className="row-wrap">
          <span className="t-xs t-3">{t('schedules.presets')}:</span>
          {PRESETS.map((p) => (
            <button key={p.key} type="button" className={`chip chip-btn${form.startTime === p.start && form.endTime === p.end ? ' chip-active' : ''}`} onClick={() => setForm({ ...form, startTime: p.start, endTime: p.end })}>
              {t(`schedules.preset.${p.key}`)} · {p.start}–{p.end}
            </button>
          ))}
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}
