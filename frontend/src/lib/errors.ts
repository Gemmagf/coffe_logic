import axios from 'axios';
import i18n from '../i18n';

/** Extracts a human-readable message from an API/axios/unknown error. */
export function getErrorMessage(err: unknown, fallbackKey = 'errors.generic'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: Record<string, string[]> } | undefined;
    if (data?.error) {
      const details = data.details ? Object.values(data.details).flat().filter(Boolean) : [];
      return details.length ? `${data.error}: ${details.join(', ')}` : data.error;
    }
    if (!err.response) return i18n.t('errors.network');
    if (err.response.status === 403) return i18n.t('errors.forbidden');
  }
  if (err instanceof Error && err.message) return err.message;
  return i18n.t(fallbackKey);
}
