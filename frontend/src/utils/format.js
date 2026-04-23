const HUMAN_MESSAGE_MAP = [
  [/body validation|error de validación en body|invalid payload/gi, 'Información inválida. Revisa los campos del formulario.'],
  [/error de validación en params|error de validación en query params/gi, 'Información inválida en la solicitud.'],
  [/foreign key/gi, 'El registro relacionado no existe o no está disponible.'],
  [/\bid\b/gi, 'código interno']
];

export const getErrorMessage = (error) => {
  const backendMessage = error?.response?.data?.message;
  if (!backendMessage) return 'No fue posible completar la operación.';
  return HUMAN_MESSAGE_MAP.reduce((message, [pattern, replacement]) => message.replace(pattern, replacement), backendMessage);
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

export const fullName = (person = {}) =>
  [person.firstName, person.lastName].filter(Boolean).join(' ') || '—';