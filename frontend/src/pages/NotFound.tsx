import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="card" style={{ maxWidth: 480, margin: '60px auto' }}>
      <EmptyState icon="search" title={t('errors.notFoundTitle')} description={t('errors.notFoundDesc')}
        action={<Button variant="primary" icon="home" onClick={() => navigate('/')}>{t('nav.home')}</Button>} />
    </div>
  );
}
