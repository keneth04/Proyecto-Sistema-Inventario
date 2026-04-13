export const getErrorMessage = (error) => error?.response?.data?.message || 'Error inesperado';

export const isValidHour = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
