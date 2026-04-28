import api from './client';


export const AuthApi = {
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  me: () => api.get('/auth/me')
};

const buildCrudApi = (resource) => ({
  list: (params) => api.get(`/${resource}`, { params }),
  findById: (id) => api.get(`/${resource}/${id}`),
  create: (payload) => api.post(`/${resource}`, payload),
  update: (id, payload) => api.put(`/${resource}/${id}`, payload),
  remove: (id) => api.delete(`/${resource}/${id}`)
});

export const UserApi = buildCrudApi('users');
export const EmployeeApi = buildCrudApi('employees');
export const CategoryApi = buildCrudApi('categories');

export const AssetApi = {
  ...buildCrudApi('assets'),
  changeStatus: (id, status) => api.patch(`/assets/${id}/status`, { status }),
  retireUnits: (id, payload) => api.patch(`/assets/${id}/retire-units`, payload)
};

export const LoanApi = {
  list: (params) => api.get('/loans', { params }),
  findById: (id) => api.get(`/loans/${id}`),
  create: (payload) => api.post('/loans', payload)
};

export const ReturnApi = {
  list: (params) => api.get('/returns', { params }),
  findById: (id) => api.get(`/returns/${id}`),
  create: (payload) => api.post('/returns', payload)
};

export const InventoryApi = {
  summary: () => api.get('/inventory/summary'),
  availableAssets: () => api.get('/inventory/available-assets'),
  loanedAssets: () => api.get('/inventory/loaned-assets'),
  executiveDashboard: () => api.get('/inventory/executive-dashboard')
};

export const AuditApi = {
  general: (params) => api.get('/audit/general', { params }),
  byAsset: (assetId, params) => api.get(`/audit/asset/${assetId}`, { params }),
  byEmployee: (employeeId, params) => api.get(`/audit/employee/${employeeId}`, { params })
};

export const ReportApi = {
  assetsByStatus: () => api.get('/reports/assets-by-status'),
  activeLoans: () => api.get('/reports/active-loans'),
  loanHistory: (params) => api.get('/reports/loan-history', { params }),
  retiredAssets: () => api.get('/reports/retired-assets'),
  inventoryGeneral: () => api.get('/reports/inventory-general')
};