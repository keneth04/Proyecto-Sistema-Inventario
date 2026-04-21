import { ROLES } from '../constants/roles';

export const INVENTORY_MANAGER_ROLES = [ROLES.ADMIN, ROLES.INVENTORY_MANAGER];

export function canManageInventory(user) {
  return INVENTORY_MANAGER_ROLES.includes(user?.role);
}