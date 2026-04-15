# Fase 3 — Diseño de dominio (MVP inventario y préstamos internos)

Este documento define el dominio nuevo de forma **independiente** del sistema anterior y sirve como contrato para backend + frontend.

## Objetivo funcional del dominio

Gestionar activos prestables internos con trazabilidad completa de:
- stock disponible,
- préstamos,
- devoluciones,
- responsables de entrega/recepción,
- historial por activo y por empleado.

## Entidades del MVP

### 1) Role
**Propósito:** catálogo de roles para autorización.
- PK: `id`
- Unicidad: `code`
- Estados: `isActive`
- Relación: `Role 1 - N User`

### 2) User
**Propósito:** usuario interno autenticado del sistema.
- PK: `id`
- FK: `roleId -> Role.id`
- Unicidad: `email`
- Campos críticos: `passwordHash`, `status`, `lastLoginAt`
- Relación operativa:
  - entrega préstamos (`Loan.deliveredByUserId`)
  - recibe devoluciones (`Return.receivedByUserId`)
  - ejecuta movimientos/auditorías

### 3) Employee
**Propósito:** colaborador receptor/devolvente de activos.
- PK: `id`
- Unicidad: `employeeCode` (y `email` opcional)
- Relación:
  - `Employee 1 - N Loan`
  - `Employee 1 - N Return`

### 4) Category
**Propósito:** clasificar activos (diademas, teclados, etc.).
- PK: `id`
- Unicidad: `name`
- Relación: `Category 1 - N Asset`

### 5) Asset
**Propósito:** activo inventariable/prestable con control de stock.
- PK: `id`
- FK: `categoryId -> Category.id`
- Unicidad: `assetCode`, `serialNumber` (opcional)
- Campos clave:
  - `totalQuantity`
  - `availableQuantity`
  - `status`
- Relación:
  - `Asset 1 - N LoanItem`
  - `Asset 1 - N ReturnItem`
  - `Asset 1 - N InventoryMovement`

### 6) Loan
**Propósito:** cabecera de entrega/prestamo.
- PK: `id`
- FK:
  - `employeeId -> Employee.id`
  - `deliveredByUserId -> User.id`
- Campos clave: `loanDate`, `expectedReturnDate`, `status`
- Relación: `Loan 1 - N LoanItem` y `Loan 1 - N Return`

### 7) LoanItem
**Propósito:** detalle de activos entregados en un préstamo.
- PK: `id`
- FK:
  - `loanId -> Loan.id`
  - `assetId -> Asset.id`
- Restricción: `unique(loanId, assetId)`
- Campos clave: `quantity`, `returnedQuantity`

### 8) Return
**Propósito:** cabecera de recepción de devolución.
- PK: `id`
- FK:
  - `loanId -> Loan.id`
  - `employeeId -> Employee.id`
  - `receivedByUserId -> User.id`
- Campos clave: `returnDate`, `observations`
- Relación: `Return 1 - N ReturnItem`

### 9) ReturnItem
**Propósito:** detalle de lo devuelto por activo.
- PK: `id`
- FK:
  - `returnId -> Return.id`
  - `loanItemId -> LoanItem.id`
  - `assetId -> Asset.id`
- Campos clave: `quantity`, `itemCondition`

### 10) InventoryMovement
**Propósito:** kardex simplificado de stock.
- PK: `id`
- FK principales:
  - `assetId -> Asset.id`
  - `performedByUserId -> User.id`
- FK opcionales de trazabilidad:
  - `employeeId`, `loanId`, `returnId`
- Campos clave:
  - `movementType`
  - `quantityDelta` (positivo o negativo)
  - `resultingStock`

### 11) AuditLog
**Propósito:** auditoría transversal de acciones críticas.
- PK: `id`
- FK principal: `performedByUserId -> User.id`
- FK opcionales de contexto: `employeeId`, `assetId`, `loanId`, `returnId`
- Campos clave:
  - `entityType`
  - `entityId`
  - `action`
  - `summary`
  - `metadata` (JSON)

---

## Reglas de negocio implementables sobre este modelo

1. No prestar activo inexistente: `LoanItem.assetId` exige FK válida.
2. No prestar más de lo disponible: validación en capa service usando `Asset.availableQuantity`.
3. Entrega obligatoria: `Loan` exige `employeeId`, `deliveredByUserId`, `loanDate`.
4. Devolución obligatoria: `Return` exige `employeeId`, `receivedByUserId`, `returnDate`; `ReturnItem` exige `itemCondition`.
5. Trazabilidad de movimiento: toda operación de stock crea `InventoryMovement`.
6. Ajustes auditables: todo ajuste relevante crea `AuditLog`.
7. Stock no negativo: regla de dominio en service + transacción atómica.
8. Quién tiene cada activo: se calcula con `LoanItem.quantity - LoanItem.returnedQuantity` por préstamo abierto.
9. Historial por activo y empleado: índices por `assetId/employeeId` en movimientos y auditoría.
10. Restricción por rol: catálogo `Role` + middleware RBAC.

---

## Índices y escalabilidad mínima

Se agregan índices orientados a consultas de MVP:
- por estado (`users`, `employees`, `assets`, `loans`),
- por fecha (`loanDate`, `returnDate`, `createdAt` en movimientos/auditoría),
- por trazabilidad (`assetId`, `employeeId`, `performedByUserId`),
- por relación de detalle (`loan_items.assetId`, `return_items.loanItemId`).

Esto cubre reportes operativos básicos sin sobreingeniería.
