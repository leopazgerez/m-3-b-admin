# Dashboard con reportes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar KPIs, balance mensual, torta por categoría y alertas del admin a los endpoints `/api/reports/*` de m3b-api.

**Architecture:** Helpers puros testeables en `src/lib/reports.ts`; tipos en `apiTypes.ts`; cada bloque del dashboard lee su endpoint con `useApiResource` y muestra su propio `ApiErrorBanner`. Notificaciones y tarjeta de stock pasan a `/reports/alerts`. Gastos acepta `?expenseId=` para abrir un gasto.

**Tech Stack:** Next.js 16 (export estático), React 19, Tailwind v4, `node:test` (Node 24). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-22-dashboard-reports-design.md` (sigue a `2026-10-21-api-integration-design.md`). Backend: `../m3b-api` rama `feat/slice-4-reports`, `src/main/java/com/m3b/api/report/**`, spec `docs/superpowers/specs/2026-10-15-reports-design.md`.

## Global Constraints

- Rama: `feat/api-integration`. Nada a `main`.
- Solo API, sin fallback; no recalcular en el navegador lo que devuelven los reportes (totales, márgenes, %, caja).
- Período por defecto del dashboard = mes en curso: `summary` y `sales-by-category` **sin** `from`/`to`.
- Porcentaje `null` → "—" (nunca "0%" ni NaN).
- Alertas con `days=7`; balance con `months=6`.
- Títulos: balance = "Cobrado vs. pagado" (base caja); torta con nota "sin descuentos ni recargos".
- Sin dependencias nuevas: gráficos en SVG/CSS (base visual: `BalanceChart.tsx` y `CategoryDonut.tsx` de `git show ffbe387:src/components/dashboard/<archivo>`).
- `npm run build`, `npm run lint` (0 problemas) y `npm test` limpios en cada tarea. Textos en español, estilo visual del archivo.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; stagear solo archivos tocados (nunca `README.md`, `graphify-out/`, `# Triple B — …md`, `.superpowers/`).

## Review Focus

1. **Mes anterior en enero / febrero bisiesto**: "Mes anterior" con hoy = 2026-01-15 debe pedir 2025-12-01..2025-12-31; con 2024-03-10, 2024-02-01..2024-02-29 → test `periodParams` (Task 1).
2. **Porcentaje null o negativo**: margen sin ventas llega `null` y debe verse "—"; margen negativo con signo → test `pctLabel` (Task 1).
3. **Montos negativos** (neto/caja < 0): hoy `money(-1500)` da "$-1.500"; debe dar "-$1.500" → test `money` (Task 1).
4. **Meses o categorías en cero**: barras y porciones sin NaN ni división por cero cuando todo es 0 → test `barRatio` (Task 1) + estado vacío en Tasks 3–4.
5. **Rango personalizado incompleto o invertido**: no se consulta y se avisa (no 400 en pantalla) → test `periodParams` custom (Task 1).

---

### Task 1: Tipos, labels y helpers puros

**Files:**
- Modify: `src/lib/apiTypes.ts`, `src/lib/labels.ts`, `src/lib/format.ts` (`money` con signo adelante)
- Create: `src/lib/reports.ts` (sin imports de runtime)
- Test: `src/lib/reports.test.ts`, `src/lib/format.test.ts`

**Interfaces — Produces:**
- `apiTypes.ts` (campos exactos de los records Java del paquete `report`): `SalesSummary { from: string; to: string; sales: { count: number; total: number; cost: number; grossProfit: number; grossMarginPct: number | null }; expenses: { total: number }; net: number; netMarginPct: number | null; cash: { collected: number; paid: number; net: number } }`, `MonthlyBalance { month: string; income: number; expenses: number }`, `CategorySales { from: string; to: string; total: number; categories: CategorySalesLine[] }`, `CategorySalesLine { categoryId: number | null; name: string; units: number; total: number; pct: number | null }`, `AlertStock { variantId: number; productId: number; product: string; variantName: string; sku: string | null; onHand: number; minStock: number; status: "OUT" | "LOW" }`, `AlertInstallment { expenseId: number; installmentNo: number; description: string; dueDate: string; amount: number; pending: number; status: "OVERDUE" | "DUE_SOON" }`, `Alerts { stock: AlertStock[]; installments: AlertInstallment[] }`.
- `labels.ts`: `installmentAlertLabel: Record<"OVERDUE" | "DUE_SOON", string>` = `{ OVERDUE: "Vencida", DUE_SOON: "Vence pronto" }`.
- `reports.ts`:
  - `type DashboardPeriod = { kind: "current" } | { kind: "previous" } | { kind: "custom"; from: string; to: string }`
  - `periodParams(p: DashboardPeriod, today: string): { from?: string; to?: string } | null` — `current` → `{}`; `previous` → primer y último día del mes anterior a `today` (YYYY-MM-DD, aritmética de calendario sin zonas); `custom` → `null` si falta alguna fecha o `from > to`, si no `{from, to}`.
  - `monthLabel(ym: string): string` — `"2026-10"` → `"oct 26"` (array fijo `ene feb mar abr may jun jul ago sep oct nov dic`, sin `toLocale`).
  - `pctLabel(p: number | null): string` — `null` → `"—"`, si no `${p.toLocaleString("es-AR")}%`.
  - `barRatio(value: number, max: number): number` — `0` si `max <= 0`, si no `value / max` acotado a 0..1.
  - `pruneReadIds(read: string[], current: string[]): string[]` — los de `read` presentes en `current`, en el orden de `read`.

- [ ] **Step 1: Tests que fallan**

```ts
// reports.test.ts
test("periodParams current", () => assert.deepEqual(periodParams({ kind: "current" }, "2026-10-22"), {}));
test("periodParams previous cruza año y bisiesto", () => {
  assert.deepEqual(periodParams({ kind: "previous" }, "2026-01-15"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(periodParams({ kind: "previous" }, "2024-03-10"), { from: "2024-02-01", to: "2024-02-29" });
  assert.deepEqual(periodParams({ kind: "previous" }, "2026-10-31"), { from: "2026-09-01", to: "2026-09-30" });
});
test("periodParams custom", () => {
  assert.deepEqual(periodParams({ kind: "custom", from: "2026-10-01", to: "2026-10-10" }, "2026-10-22"), { from: "2026-10-01", to: "2026-10-10" });
  assert.equal(periodParams({ kind: "custom", from: "2026-10-11", to: "2026-10-10" }, "2026-10-22"), null);
  assert.equal(periodParams({ kind: "custom", from: "", to: "2026-10-10" }, "2026-10-22"), null);
});
test("monthLabel", () => { assert.equal(monthLabel("2026-10"), "oct 26"); assert.equal(monthLabel("2027-01"), "ene 27"); });
test("pctLabel", () => { assert.equal(pctLabel(null), "—"); assert.equal(pctLabel(12.5), "12,5%"); assert.equal(pctLabel(-3), "-3%"); });
test("barRatio", () => { assert.equal(barRatio(5, 0), 0); assert.equal(barRatio(5, 10), 0.5); assert.equal(barRatio(-1, 10), 0); });
test("pruneReadIds", () => assert.deepEqual(pruneReadIds(["a", "b", "c"], ["c", "a", "z"]), ["a", "c"]));
// format.test.ts
test("money con signo adelante", () => { assert.equal(money(1500.5), "$1.500,5"); assert.equal(money(-1500), "-$1.500"); assert.equal(money(0), "$0"); });
```

- [ ] **Step 2:** `npm test` → FAIL (módulos/exports faltantes; `money(-1500)` da `"$-1.500"`).
- [ ] **Step 3: Implementar** tipos, label, `reports.ts` y el cambio de `money` (`n < 0 ? "-$" + abs : "$" + n`, mismo `toLocaleString("es-AR")`).
- [ ] **Step 4:** `npm test` → PASS; `npm run build`, `npm run lint` OK.
- [ ] **Step 5: Commit** — `feat(dashboard): tipos y helpers de reportes`

---

### Task 2: Selector de período y KPIs

**Files:** Modify `src/app/(admin)/dashboard/page.tsx`; Create `src/components/dashboard/PeriodSelector.tsx`

**Interfaces:**
- Consumes: `DashboardPeriod`, `periodParams`, `pctLabel` (Task 1); `toLocalISODate` (`dateUtils.ts`); `money` (`format.ts`); `useApiResource`, `api.getOne`, `KpiCard`, `ApiErrorBanner`.
- Produces: `<PeriodSelector value={DashboardPeriod} onChange={(p: DashboardPeriod) => void} />` (botones "Este mes" / "Mes anterior" / "Personalizado"; en custom, dos `<input type="date">` y aviso "Elegí un rango válido" cuando `periodParams` da `null`). El page guarda `period` (default `{kind:"current"}`) y calcula `params = periodParams(period, toLocalISODate())`, que Task 4 también usa.

Comportamiento:
- `GET /reports/summary` con `params` (si `params === null` no se consulta).
- KPIs: **Ventas** (`money(sales.total)`, delta `${count} ventas`), **Ganancia bruta** (`money(grossProfit)`, badge `pctLabel(grossMarginPct)`), **Gastos** (`money(expenses.total)`), **Neto** (`money(net)`, badge `pctLabel(netMarginPct)`, `badgeType` danger si `net < 0`). Fila de caja: **Cobrado**, **Pagado**, **Caja neta** (danger si < 0). Se mantiene el KPI de stock (`/stock/summary`). Rango mostrado = `data.from`–`data.to` con `formatDate`.
- Quitar el `<PendingApi>` de "Ventas, gastos y ganancia neta" y el comentario viejo "Header Section with Timeframe & CTA".

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano** (API en `feat/slice-4-reports`): KPIs = `GET /api/reports/summary` en Swagger; "Mes anterior" cambia los valores; rango invertido no dispara request (Network) y muestra el aviso; sin ventas los márgenes muestran "—".
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(dashboard): período y KPIs desde /reports/summary`

---

### Task 3: Gráfico "Cobrado vs. pagado"

**Files:** Create `src/components/dashboard/BalanceChart.tsx`; Modify `src/app/(admin)/dashboard/page.tsx`

**Interfaces:** Consumes `MonthlyBalance`, `monthLabel`, `barRatio`, `money`. Produces `<BalanceChart />` (sin props; pide sus datos).

- `GET /reports/monthly-balance` con `{ months: 6 }`, independiente del período. Barras agrupadas por mes (cobrado / pagado), alto = `barRatio(valor, máximo de ambas series)`, eje X = `monthLabel(month)`, tooltip/título con `money`. Subtítulo: "Base caja: cobros a clientes y pagos de gastos". Todo en 0 → barras vacías sin NaN y texto "Sin movimientos de caja". Error → `ApiErrorBanner` con reintentar.
- Reemplaza el `<PendingApi>` de "Balance mensual".

- [ ] **Step 1: Implementar** (partir del estilo de `git show ffbe387:src/components/dashboard/BalanceChart.tsx`).
- [ ] **Step 2: Verificar a mano:** 6 meses terminando en el actual; valores = endpoint; cambiar período no lo recarga.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(dashboard): gráfico cobrado vs. pagado`

---

### Task 4: Torta de ventas por categoría

**Files:** Create `src/components/dashboard/CategoryDonut.tsx`; Modify `src/app/(admin)/dashboard/page.tsx`

**Interfaces:** Consumes `CategorySales`, `pctLabel`, `money`, `params` del page (Task 2). Produces `<CategoryDonut params={{ from?: string; to?: string } | null} />`.

- `GET /reports/sales-by-category` con `params` (null → no consulta). Donut SVG con porciones por `pct` (null/0 se omiten del arco), leyenda: nombre, `money(total)`, `${units} u.`, `pctLabel(pct)`. Nota bajo el título: "Precio de lista, sin descuentos ni recargos". `categories` vacío o `total === 0` → "Sin ventas en el período". Colores: paleta fija de la marca rotando por índice.
- Reemplaza el `<PendingApi>` de "Ventas por categoría".

- [ ] **Step 1: Implementar** (partir de `git show ffbe387:src/components/dashboard/CategoryDonut.tsx`).
- [ ] **Step 2: Verificar a mano:** coincide con el endpoint; sigue al selector de período; "Sin categoría" aparece si hay productos sin categoría.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(dashboard): ventas por categoría`

---

### Task 5: `/gastos?expenseId=` abre el gasto

**Files:** Move `src/app/(admin)/gastos/page.tsx` → `src/app/(admin)/gastos/GastosContent.tsx`; Create new `src/app/(admin)/gastos/page.tsx` (wrapper con `<Suspense>`, mismo patrón que `stock/page.tsx`)

**Interfaces:** Produces la URL `/gastos?expenseId=<number>` que Task 6 usa.

- `GastosContent` lee `expenseId` con `useSearchParams`; si es entero positivo, `setDetailId(id)` una sola vez por valor (patrón "set state during render on key change" de `StockContent.tsx`). Cerrar el modal no lo reabre. Id inexistente → el modal muestra el 404 del backend en su banner; la lista sigue usable. Valor no numérico → se ignora.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** `/gastos?expenseId=<id real>` abre el detalle; cerrar no reabre; `?expenseId=abc` no hace nada; id inexistente muestra error en el modal.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(gastos): abrir un gasto por ?expenseId`

---

### Task 6: Alertas desde `/reports/alerts`

**Files:** Modify `src/components/layout/NotificationsPopover.tsx`, `src/components/dashboard/StockAlertsCard.tsx`

**Interfaces:** Consumes `Alerts`, `AlertStock`, `AlertInstallment`, `installmentAlertLabel`, `pruneReadIds` (Task 1), `formatDate`, `money`, la URL de Task 5.

- Popover: una sola llamada `GET /reports/alerts` con `{ days: 7 }` (quita las de `/stock` y `/expenses`). Ítems: stock (`stock-<variantId>`, título producto + variante, `OUT`/`LOW`, link `/stock?productId=&variantId=`) y cuotas (`installment-<expenseId>-<installmentNo>`, `description` + "cuota N", `installmentAlertLabel[status]`, `formatDate(dueDate)`, `money(pending)`, link `/gastos?expenseId=<id>`). Badge = no leídos de todos los ítems; lista con scroll. Al guardar el estado leído (clave existente `mates_admin_notifications_read`, try/catch) aplicar `pruneReadIds(read, idsActuales)`.
- StockAlertsCard: `GET /reports/alerts` con `{ days: 7 }`, muestra `stock.slice(0, 5)` (la API ya ordena OUT primero), mismo link a `/stock`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** una cuota que vence mañana aparece como "Vence pronto" con su fecha de vencimiento; una vencida como "Vencida"; el link abre ese gasto; marcar leído persiste al recargar; con la API apagada el popover muestra el error.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(alertas): notificaciones y stock desde /reports/alerts`
