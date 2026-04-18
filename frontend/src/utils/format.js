export const getErrorMessage = (error) =>
  error?.response?.data?.message || 'No fue posible completar la operación.';

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const fullName = (person = {}) =>
  [person.firstName, person.lastName].filter(Boolean).join(' ') || '—';