const { reportRepository } = require('../repositories/reportRepository');

const STATUS_LABELS = {
  ACTIVE: 'Disponible',
  MAINTENANCE: 'Mantenimiento',
  INACTIVE: 'Inactivo',
  RETIRED: 'Retirado'
};

const toActorName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.email || 'Sistema';
};

const toDateRange = ({ from, to }) => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(now.getMonth() - 3);

  const start = from ? new Date(from) : defaultFrom;
  const end = to ? new Date(to) : now;

  const safeStart = Number.isNaN(start.getTime()) ? defaultFrom : start;
  const safeEnd = Number.isNaN(end.getTime()) ? now : end;

  return safeStart <= safeEnd ? { from: safeStart, to: safeEnd } : { from: safeEnd, to: safeStart };
};

const reportService = {
  assetsByStatus: async () => {
    const rows = await reportRepository.assetsByStatus();
    return rows.map((asset) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category?.name || 'Sin categoría',
      status: asset.status,
      statusLabel: STATUS_LABELS[asset.status] || asset.status,
      totalQuantity: asset.totalQuantity,
      availableQuantity: asset.availableQuantity,
      loanedQuantity: Math.max(asset.totalQuantity - asset.availableQuantity, 0)
    }));
  },

  activeLoans: async () => {
    const rows = await reportRepository.activeLoans();
    return rows.map((loan) => ({
      loanId: loan.id,
      loanDate: loan.loanDate,
      expectedReturnDate: loan.expectedReturnDate,
      status: loan.status,
      employeeCode: loan.employee.employeeCode,
      employeeName: `${loan.employee.firstName} ${loan.employee.lastName}`.trim(),
      deliveredBy: toActorName(loan.deliveredByUser),
      itemsCount: loan.items.length,
      totalUnits: loan.items.reduce((acc, item) => acc + item.quantity, 0),
      pendingUnits: loan.items.reduce((acc, item) => acc + Math.max(item.quantity - item.returnedQuantity, 0), 0)
    }));
  },

  loanHistory: async (rangeInput) => {
    const range = toDateRange(rangeInput);
    const rows = await reportRepository.loanHistory(range);

    return {
      range,
      items: rows.map((loan) => ({
        loanId: loan.id,
        loanDate: loan.loanDate,
        status: loan.status,
        employeeCode: loan.employee.employeeCode,
        employeeName: `${loan.employee.firstName} ${loan.employee.lastName}`.trim(),
        deliveredBy: toActorName(loan.deliveredByUser),
        itemsCount: loan.items.length,
        totalUnits: loan.items.reduce((acc, item) => acc + item.quantity, 0),
        returnedUnits: loan.items.reduce((acc, item) => acc + item.returnedQuantity, 0)
      }))
    };
  },

  retiredAssets: async () => {
    const rows = await reportRepository.retiredAssets();
    return rows.map((asset) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category?.name || 'Sin categoría',
      retiredAt: asset.updatedAt,
      description: asset.description || ''
    }));
  },

  inventoryGeneral: async () => {
    const rows = await reportRepository.inventoryGeneral();
    return rows.map((asset) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      brand: asset.brand || '',
      category: asset.category?.name || 'Sin categoría',
      status: asset.status,
      statusLabel: STATUS_LABELS[asset.status] || asset.status,
      totalQuantity: asset.totalQuantity,
      availableQuantity: asset.availableQuantity,
      loanedQuantity: Math.max(asset.totalQuantity - asset.availableQuantity, 0)
    }));
  }
};

module.exports = { reportService };