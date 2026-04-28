const HUMAN_MESSAGE_MAP = [
  [/credenciales inválidas/gi, 'Credenciales incorrectas'],
  [/body validation|error de validación en body|invalid payload/gi, 'Información inválida. Revisa los campos del formulario.'],
  [/error de validación en params|error de validación en query params/gi, 'Información inválida en la solicitud.'],
  [/foreign key/gi, 'El registro relacionado no existe o no está disponible.'],
  [/\bid\b/gi, 'código interno']
];

const normalizeHumanMessage = (message = '') =>
  HUMAN_MESSAGE_MAP.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    message
  );

const getFirstDetailMessage = (error) => {
  const detail = error?.response?.data?.details?.[0];
  if (!detail?.message) return null;
  if (detail?.field) {
    return `${detail.field}: ${detail.message}`;
  }
  return detail.message;
};

export const getErrorMessage = (error) => {
  const backendMessage = error?.response?.data?.message;
  const firstDetail = getFirstDetailMessage(error);

  if (firstDetail) {
    return normalizeHumanMessage(firstDetail);
  }

  if (!backendMessage) return 'No fue posible completar la operación.';
  return normalizeHumanMessage(backendMessage);
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || '—';
