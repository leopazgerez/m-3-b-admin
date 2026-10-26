# Dashboard con reportes de m3b-api — Diseño

Fecha: 2026-10-22 · Estado: para aprobación · Sigue a `2026-10-21-api-integration-design.md` (sus metas, anti-metas y restricciones siguen vigentes).

## 1. Intención

La API sumó el slice 4 de reportes (rama `feat/slice-4-reports` de `m3b-api`). El dashboard del admin hoy muestra "Pendiente de API" en los KPIs financieros, el gráfico de balance y la torta por categoría, y las notificaciones se arman con dos lecturas (`/stock` + `/expenses`). Objetivo: conectar esas piezas a los cuatro endpoints nuevos, para probarlos desde la UI real.

## 2. Endpoints (fuente: `m3b-api/src/main/java/com/m3b/api/report/`, spec `m3b-api/docs/superpowers/specs/2026-10-15-reports-design.md`)

Todos `GET`, con JWT, envoltorio `SingleResponse` (`api.getOne` ya desenvuelve `data`). Dinero = número con 2 decimales, nunca null (0.00 si no hay datos). Porcentajes = número con 2 decimales o **null** cuando la base es 0. Fechas `YYYY-MM-DD`, meses `"YYYY-MM"`. Zona horaria del negocio: la resuelve el servidor.

| Endpoint | Params | `data` |
|---|---|---|
| `/reports/summary` | `from?`, `to?` (inclusive; sin params = mes en curso hasta hoy; `from > to` → 400 `field=from`) | `{from, to, sales:{count, total, cost, grossProfit, grossMarginPct}, expenses:{total}, net, netMarginPct, cash:{collected, paid, net}}` |
| `/reports/monthly-balance` | `months` 1..24 (default 6) | `[{month:"YYYY-MM", income, expenses}]`, cronológico, termina en el mes actual, meses vacíos en 0 — **base caja** (cobros a clientes vs pagos de gastos) |
| `/reports/sales-by-category` | `from?`, `to?` (mismas reglas) | `{from, to, total, categories:[{categoryId|null, name, units, total, pct|null}]}` ordenado por total desc; **excluye ajustes** (descuentos/recargos), así que `total` puede diferir de `summary.sales.total` |
| `/reports/alerts` | `days` 0..60 (default 7) | `{stock:[{variantId, productId, product, variantName, sku|null, onHand, minStock, status:"OUT"|"LOW"}], installments:[{expenseId, installmentNo, description, dueDate, amount, pending, status:"OVERDUE"|"DUE_SOON"}]}` — sin paginar |

## 3. Decisiones

Del usuario:
- **D1. Período por defecto = mes en curso** (sin `from`/`to`, como devuelve la API).
- **D2. Se acepta la propuesta completa** (secciones 4.1–4.5).

Mías (marcadas para revisión):
- **D3. Gráficos sin dependencias nuevas**: SVG/CSS a mano, partiendo de los `BalanceChart.tsx` y `CategoryDonut.tsx` que existían antes (recuperables de git en `ffbe387`), reescritos contra los tipos nuevos.
- **D4. Etiquetas honestas**: el gráfico de balance se titula como caja ("Cobrado vs. pagado"); la torta aclara "sin descuentos ni recargos". Así no parecen contradecir los KPIs.
- **D5. Porcentaje null → "—"**, nunca "0%" ni NaN.
- **D6. Ventana de alertas = 7 días** (default de la API) para notificaciones y tarjeta.
- **D7. Cuotas vencidas sin límite inferior**: la API devuelve todas las vencidas impagas (solo acota hacia adelante con `days`). El badge cuenta todas las no leídas; el popover hace scroll (sin "ver más").
- **D8. Link de cuota a su gasto**: `/gastos?expenseId=<id>` abre `ExpenseDetailModal` de ese gasto (mismo patrón que `/stock?productId=`; la página se envuelve en `<Suspense>` para `useSearchParams`). Id inexistente → 404 en el modal, sin romper la lista.
- **D9. KPI de stock sigue en `/stock/summary`**: misma vista (`v_stock_status`) que las alertas, así que los conteos coinciden.
- **D10. "Ventas recientes" ignora el período**: siguen siendo las 5 últimas.

## 4. Diseño

### 4.1 Selector de período (dashboard)
Opciones: **Este mes** (default, sin params), **Mes anterior** (`from` = 1º del mes anterior, `to` = último día del mes anterior, calculados en fecha local), **Personalizado** (dos `<input type="date">`; si `from > to` no se consulta y se muestra el aviso). El período elegido alimenta `summary` y `sales-by-category`. El texto del rango mostrado sale de `data.from`/`data.to` que devuelve la API (no del estado local).

### 4.2 KPIs (`/reports/summary`)
Fila principal: **Ventas** (total, con `count` ventas como subtítulo), **Ganancia bruta** (+ `grossMarginPct`), **Gastos** (`expenses.total`), **Neto** (+ `netMarginPct`). Fila de caja: **Cobrado**, **Pagado**, **Caja neta**. Se conserva el KPI de stock actual (`/stock/summary`). Negativos se muestran con signo y color de alerta. Ningún valor se recalcula en el navegador.

### 4.3 Balance mensual (`/reports/monthly-balance?months=6`)
Barras agrupadas por mes (cobrado vs. pagado), etiqueta de mes en español corto ("oct 26") a partir de `"YYYY-MM"` sin conversión de zona. Independiente del selector de período.

### 4.4 Ventas por categoría (`/reports/sales-by-category`)
Torta/donut con `pct` por categoría (las de `pct` null o total 0 → estado vacío "Sin ventas en el período"), leyenda con nombre, total, unidades y %. "Sin categoría" llega del servidor tal cual.

### 4.5 Alertas (`/reports/alerts?days=7`)
- **NotificationsPopover**: reemplaza las dos lecturas actuales por una sola. Ítems: stock (`OUT`/`LOW`, link `/stock?productId=&variantId=`) y cuotas (`OVERDUE`/`DUE_SOON`, muestra `dueDate` y `pending`, link `/gastos?expenseId=<id>` — D8). Ids estables `stock-<variantId>` e `installment-<expenseId>-<installmentNo>`; el estado leído sigue en `localStorage` (clave existente) y se poda a los ids actuales al guardar.
- **StockAlertsCard**: usa `alerts.stock` (primeros 5, OUT primero como ya ordena la API) en lugar de `GET /stock` filtrado.

### 4.6 Tipos y estados
Tipos nuevos en `src/lib/apiTypes.ts` (`SalesSummary`, `MonthlyBalance`, `CategorySales`, `Alerts`…) derivados de los records Java. Labels nuevos en `labels.ts` (`OVERDUE` "Vencida", `DUE_SOON` "Vence pronto"). Cada bloque tiene su propio `ApiErrorBanner` con reintentar; nada de datos de respaldo.

## 5. Fuera de alcance
`/settings` y conciliación de cuentas (no existen aún); cambios en el backend; filtros por categoría o cuenta en el dashboard; mergear ramas.

## 6. Cómo se prueba
API corriendo **desde la rama `feat/slice-4-reports`**. Lógica pura con `npm test` (cálculo de "mes anterior", etiqueta de mes, formato de % null). Verificación manual: KPIs coinciden con `GET /api/reports/summary` en Swagger; cambiar a mes anterior cambia KPIs y torta pero no el balance; rango inválido no consulta; una cuota que vence mañana aparece como "Vence pronto"; con la API apagada cada bloque muestra su error.
