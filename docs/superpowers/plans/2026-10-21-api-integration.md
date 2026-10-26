# Conexión del admin a m3b-api — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada pantalla del admin cuyo dominio exista en m3b-api lea y escriba solo contra la API, con login JWT real.

**Architecture:** Un cliente `fetch` (`src/lib/api.ts`) con token de `sessionStorage`, helpers puros testeables (`src/lib/apiQuery.ts`, `src/lib/saleEstimate.ts`), dos hooks de lectura (`src/lib/useApi.ts`) y un guard de sesión en el layout `(admin)`. Cada pantalla se reescribe contra los tipos de la API (`src/lib/apiTypes.ts`); el store de `localStorage` convive hasta la última tarea y luego se borra.

**Tech Stack:** Next.js 16 (export estático, solo cliente), React 19, TypeScript, Tailwind v4, `node:test` de Node 24 (type stripping nativo) para la lógica pura. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-21-api-integration-design.md`. Contrato de la API: `../m3b-api/docs/superpowers/specs/2026-10-12-api-contract-design.md` (§3 parámetros de lista y errores, §4 campos de cada recurso y qué es ordenable **S** / buscable **Q**). Swagger: `http://localhost:8080/swagger-ui.html`.

## Global Constraints

- Rama: `feat/api-integration`. Nada se sube a `main`.
- Solo API: ninguna pantalla migrada lee `useStore()`, `localStorage` ni `data.ts`. Sin fallback cuando la API falla.
- No recalcular lo que la API devuelve (stock, `status`, saldos, `outstanding`, totales de venta, recargos). Única excepción: el total estimado de Nueva venta (`estimateSale`).
- Entidades por id, nunca por nombre.
- Base URL por defecto `http://localhost:8080/api`; todas las rutas bajo `/api`.
- Token en `sessionStorage`; cualquier 401 (salvo el de `/auth/login`) borra la sesión y lleva a `${basePath}/login/`.
- Listas por cursor: `length` 1..200, `cursor` / `before`, `sortBy`, `sortDir` (`asc`|`desc`), `search` (≤ 100 chars), `filter` = base64 del JSON en **UTF-8**. Nunca enviar `start`.
- Dinero: número con ≤ 2 decimales (más decimales = 400). Inputs de dinero con `step="0.01"`.
- Instantes (`soldAt`, `paidAt`, `movedAt`, `createdAt`, `expiresAt`) en ISO UTC: se muestran en hora local. Fechas (`incurredOn`, `dueDate`, `firstDueDate`, `lastActivityOn`) son `YYYY-MM-DD` y se muestran sin convertir zona.
- Los mensajes de error del backend se muestran tal cual (en inglés), con `status` y `field` si viene.
- Conservar el estilo visual de cada archivo (hex hardcodeados, Sora/Inter). Textos de UI en español.
- Sin dependencias nuevas. `npm run build`, `npm run lint` y `npm test` limpios al cerrar cada tarea.
- Mensajes de commit terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Sesión vencida a mitad de uso** (el JWT dura 8 h): la siguiente llamada da 401 y se espera volver a `/login`, no una pantalla rota. Al cargar, un token con `expiresAt` pasado se trata como sin sesión → test `isExpired` en Task 2.
2. **Dinero con más de 2 decimales** (descuento en %, recargo por %): la API responde 400. Todo lo que el front calcula se redondea HALF_UP a 2 → tests `round2` y `estimateSale` en Task 13.
3. **Ventas cerca de medianoche**: `soldAt` 2026-10-01T02:30Z es el 30/09 en Argentina; un filtro "desde/hasta" por día debe usar los límites del día **local** → test `instantRangeCriteria` en Task 1.
4. **Vaciar un campo opcional al editar**: en productos, variantes y proveedores `""` borra y `null` conserva; en clientes, categorías de gasto y gastos `null` borra. Mandar el valor equivocado deja el dato viejo sin aviso → paso de verificación manual en Tasks 6, 7, 10 y 15.
5. **Doble clic en "Confirmar venta" / "Registrar cobro"**: crea dos registros. Todo botón de escritura queda deshabilitado mientras la request está en curso → paso de verificación manual en Tasks 11, 12 y 14.

## Preparación del entorno de prueba (una vez)

En `../m3b-api`, con Postgres corriendo:
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/m3b SPRING_DATASOURCE_USERNAME=... SPRING_DATASOURCE_PASSWORD=... \
APP_JWT_SECRET=<32+ bytes> APP_ADMIN_EMAIL=admin@m3b.local APP_ADMIN_PASSWORD=<8+ chars> APP_ADMIN_NAME="Admin" \
APP_CORS_ORIGINS=http://localhost:3000 ./mvnw spring-boot:run
```
En el admin: `npm run dev`. Las migraciones siembran cuentas (Caja, Lemon, Banco), medios de pago (Efectivo, Transferencia, Tarjeta de crédito) y seis categorías de gasto.

---

### Task 1: Runner de tests y helpers puros de consulta

**Files:**
- Modify: `package.json` (script `test`), `tsconfig.json` (`"allowImportingTsExtensions": true`)
- Create: `src/lib/apiQuery.ts`
- Test: `src/lib/apiQuery.test.ts`

**Interfaces:**
- Produces:
  - `type FilterOperator = "EQUALS" | "NOT_EQUALS" | "LIKE" | "GREATER_THAN" | "LESS_THAN" | "GREATER_OR_EQUAL" | "LESS_OR_EQUAL" | "BETWEEN" | "IN" | "IS_NULL" | "IS_NOT_NULL"`
  - `interface Criterion { field: string; operator: FilterOperator; value?: unknown }`
  - `interface ListQuery { length?: number; cursor?: string; before?: string; sortBy?: string; sortDir?: "asc" | "desc"; search?: string; filters?: Criterion[] }`
  - `encodeFilter(filters: Criterion[]): string | undefined` — `undefined` si la lista está vacía; si no, base64 de `{"combinator":"AND","filters":[...]}` codificado en UTF-8.
  - `toSearchParams(q: ListQuery): URLSearchParams` — omite claves vacías/undefined, `search` vacío o solo espacios, y `filter` si no hay criterios.
  - `instantRangeCriteria(field: string, from?: string, to?: string): Criterion[]` — `from`/`to` son `YYYY-MM-DD` locales; produce `GREATER_OR_EQUAL` inicio local de `from` y `LESS_THAN` inicio local del día siguiente a `to`, ambos como `toISOString()`.
  - `dateRangeCriteria(field: string, from?: string, to?: string): Criterion[]` — `GREATER_OR_EQUAL from` / `LESS_OR_EQUAL to`, sin conversión.
  - `collectAll<T>(fetchPage: (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>): Promise<T[]>`
  - `errorInfo(status: number, body: unknown): { message: string; field?: string; details?: unknown }` — si `body` es un objeto con `message` string, lo usa; si no, `message = "HTTP <status>"`.

`apiQuery.ts` no importa nada (salvo `import type`), para que `node --test` lo cargue sin alias.

- [ ] **Step 1: Agregar script y opción de TS**

`package.json`: `"test": "TZ=America/Argentina/Buenos_Aires node --test src/lib/*.test.ts"`. `tsconfig.json`: `"allowImportingTsExtensions": true` (los tests importan `./apiQuery.ts`).

- [ ] **Step 2: Escribir los tests que fallan** en `src/lib/apiQuery.test.ts` con `node:test` y `node:assert/strict`:

```ts
test("encodeFilter: vacío → undefined", () => assert.equal(encodeFilter([]), undefined));
test("encodeFilter: UTF-8", () => {
  const f = encodeFilter([{ field: "city", operator: "EQUALS", value: "Córdoba" }])!;
  assert.deepEqual(JSON.parse(Buffer.from(f, "base64").toString("utf8")),
    { combinator: "AND", filters: [{ field: "city", operator: "EQUALS", value: "Córdoba" }] });
});
test("toSearchParams omite vacíos", () => {
  assert.equal(toSearchParams({ length: 20, search: "  ", filters: [], sortDir: "asc" }).toString(), "length=20&sortDir=asc");
});
test("instantRangeCriteria usa días locales (AR, UTC-3)", () => {
  assert.deepEqual(instantRangeCriteria("soldAt", "2026-10-01", "2026-10-01"), [
    { field: "soldAt", operator: "GREATER_OR_EQUAL", value: "2026-10-01T03:00:00.000Z" },
    { field: "soldAt", operator: "LESS_THAN", value: "2026-10-02T03:00:00.000Z" },
  ]);
  assert.deepEqual(instantRangeCriteria("soldAt"), []);
});
test("dateRangeCriteria", () => {
  assert.deepEqual(dateRangeCriteria("incurredOn", undefined, "2026-10-31"),
    [{ field: "incurredOn", operator: "LESS_OR_EQUAL", value: "2026-10-31" }]);
});
test("collectAll sigue nextCursor", async () => {
  const pages: Record<string, { items: number[]; nextCursor: string | null }> =
    { "": { items: [1, 2], nextCursor: "a" }, a: { items: [3], nextCursor: null } };
  assert.deepEqual(await collectAll((c) => Promise.resolve(pages[c ?? ""])), [1, 2, 3]);
});
test("errorInfo", () => {
  assert.deepEqual(errorInfo(409, { message: "Product still has stock", status: 409, details: { productId: 1 } }),
    { message: "Product still has stock", field: undefined, details: { productId: 1 } });
  assert.equal(errorInfo(502, "<html>").message, "HTTP 502");
});
```

- [ ] **Step 3: Correr y ver que falla** — `npm test` → FAIL (módulo `./apiQuery.ts` no existe).
- [ ] **Step 4: Implementar `src/lib/apiQuery.ts`** — base64 con `btoa(String.fromCharCode(...new TextEncoder().encode(json)))` (contrato §3: `btoa` directo falla con no-ASCII).
- [ ] **Step 5: Correr** — `npm test` → PASS; `npm run build` → OK.
- [ ] **Step 6: Commit** — `git add package.json tsconfig.json src/lib/apiQuery.ts src/lib/apiQuery.test.ts && git commit -m "feat(api): helpers de consulta y runner de tests"`

---

### Task 2: Tipos de la API, sesión y cliente HTTP

**Files:**
- Create: `src/lib/apiTypes.ts`, `src/lib/labels.ts`, `src/lib/session.ts`
- Rewrite: `src/lib/api.ts`
- Modify: `src/config/env.ts` (fallbacks a `http://localhost:8080/api` y `http://localhost:8080`), `.env.example` (mismos valores), `.github/workflows/deploy.yml:44` (fallback `http://localhost:8080/api`)
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Consumes: `ListQuery`, `toSearchParams`, `collectAll`, `errorInfo` (Task 1).
- Produces:
  - `apiTypes.ts`: uniones de enums `StockStatus`, `SupplierType`, `MovementType`, `SaleType`, `AdjustmentType`, `AccountType`, `CostSource`, `ExpenseKind`, `ExpenseStatus` (`PAID|OVERDUE|IN_INSTALLMENTS|PENDING`), `InstallmentStatus`, `PaymentStatus` (`PENDING|PARTIAL|PAID|N/A|CANCELLED`); e interfaces `CurrentUser`, `LoginResponse`, `ProductCategory`, `Product`, `Variant`, `CostHistoryEntry`, `VariantLookup`, `Supplier`, `StockRow`, `StockSummary`, `StockMovement`, `RestockResult`, `AdjustmentResult`, `Customer`, `AccountEntry`, `Payment`, `PaymentMethod`, `FinancialAccount`, `Sale`, `SaleLine`, `ExpenseCategory`, `ExpenseRow`, `Expense`, `ExpenseInstallment`, `ExpenseSummary`. Campos exactamente como contrato §4 / DTOs del backend (verificar en `/v3/api-docs`); los opcionales del backend tipados `T | null`. IDs `number`. Los nombres no chocan con `types.ts` porque viven en otro módulo; las pantallas migradas importan solo de `apiTypes`.
  - `labels.ts`: un `Record<Enum, string>` en español por enum (ej. `stockStatusLabel.LOW = "Bajo stock"`, `accountTypeLabel.CASH = "Efectivo"`, `saleTypeLabel.WHOLESALE = "Mayorista"`).
  - `session.ts`: `interface Session { accessToken: string; expiresAt: string; user: CurrentUser }`; `isExpired(expiresAt: string, now?: Date): boolean`; `getSession(): Session | null` (null si falta, JSON inválido o vencida; clave `sessionStorage` `"m3b_session"`); `saveSession(s: Session): void`; `clearSession(): void`. Todo acceso a `sessionStorage` dentro de try/catch.
  - `api.ts`:
    - `class ApiError extends Error { status: number; field?: string; details?: unknown }`
    - `interface Page<T> { items: T[]; nextCursor: string | null; prevCursor: string | null; total: number }`
    - `api.getOne<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>`
    - `api.getPage<T>(path: string, q?: ListQuery): Promise<Page<T>>`
    - `api.getAll<T>(path: string, q?: Omit<ListQuery, "cursor" | "before" | "length">): Promise<T[]>` — `length=200` + `collectAll`.
    - `api.post<T>(path: string, body?: unknown): Promise<T>`, `api.patch<T>(path: string, body: unknown): Promise<T>`, `api.del(path: string): Promise<void>`
    - Toda respuesta con cuerpo objeto que tenga `data` se desenvuelve a `data`; 204 → `undefined`. Cualquier no-OK → `ApiError` vía `errorInfo`. 401 con `path !== "/auth/login"` → `clearSession()` y `window.location.href = \`${env.basePath}/login/\`` antes de lanzar. Error de red (fetch rechaza) → `ApiError` con `status: 0` y `message: "No se pudo conectar con la API (<apiUrl>)"`.

- [ ] **Step 1: Test que falla** en `src/lib/session.test.ts`:

```ts
test("isExpired", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  assert.equal(isExpired("2026-10-21T11:59:59Z", now), true);
  assert.equal(isExpired("2026-10-21T12:00:01Z", now), false);
  assert.equal(isExpired("no-es-fecha", now), true);
});
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implementar** `session.ts` (solo `import type` de `./apiTypes`), `apiTypes.ts`, `labels.ts`, `api.ts`, y los cambios de env/.env.example/deploy.yml. Ninguna pantalla usa todavía `api.ts`; el `api.ts` viejo no tenía consumidores.
- [ ] **Step 4:** `npm test` → PASS; `npm run build` y `npm run lint` → OK.
- [ ] **Step 5: Commit** — `feat(api): cliente HTTP con sesión JWT y tipos de la API`

---

### Task 3: Hooks de lectura y componentes de estado

**Files:**
- Create: `src/lib/useApi.ts`, `src/components/ui/ApiErrorBanner.tsx`, `src/components/ui/Pager.tsx`, `src/components/ui/PendingApi.tsx`
- Modify: `src/components/ui/index.ts` (exportar los tres)

**Interfaces:**
- Consumes: `api`, `ApiError`, `Page<T>` (Task 2); `ListQuery` (Task 1).
- Produces:
  - `useApiResource<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: ApiError | null; reload: () => void }` — descarta respuestas de llamadas obsoletas (si `deps` cambió mientras volaba).
  - `usePagedList<T>(path: string, query: Omit<ListQuery, "cursor" | "before">): { items: T[]; total: number; loading: boolean; error: ApiError | null; hasNext: boolean; hasPrev: boolean; next: () => void; prev: () => void; reload: () => void }` — cambio en `JSON.stringify(query)` vuelve a la primera página; `reload` recarga la página actual (mismo cursor); `next` usa `nextCursor` como `cursor`, `prev` usa `prevCursor` como `before`. Búsqueda: el llamador hace debounce (300 ms) antes de pasar `search`.
  - `useOptions<T>(path: string, q?: Omit<ListQuery, "cursor" | "before" | "length">): { options: T[]; loading: boolean; error: ApiError | null; reload: () => void }` — vía `api.getAll`, para selects.
  - `<ApiErrorBanner error={unknown} onRetry?={() => void} />` — `null` sin error; muestra `status`, `message` y `field` si es `ApiError`, si no `String(error)`.
  - `<Pager hasPrev hasNext onPrev onNext total? loading? />` — botones "Anterior" / "Siguiente" y "N resultados".
  - `<PendingApi title={string} endpoint={string} />` — tarjeta "Pendiente de API" con el endpoint previsto (ej. `GET /api/reports/summary`).

- [ ] **Step 1: Implementar** los cuatro archivos con el estilo de `components/ui` (bordes `#E7DFD2`, texto `#7A6F63`; error en tonos rojos de `Badge`).
- [ ] **Step 2:** `npm run build` y `npm run lint` → OK.
- [ ] **Step 3: Commit** — `feat(ui): hooks de lectura, paginador y estados de API`

---

### Task 4: Login real y guard de sesión

**Files:**
- Create: `src/lib/auth.tsx`
- Modify: `src/app/login/page.tsx`, `src/app/(admin)/layout.tsx`, `src/components/layout/Sidebar.tsx` (botón de salida, ~línea 301), `src/components/layout/Topbar.tsx` (nombre del usuario si hoy muestra uno fijo)

**Interfaces:**
- Consumes: `api`, `ApiError` (Task 2), `getSession`, `saveSession`, `clearSession` (Task 2).
- Produces:
  - `login(email: string, password: string): Promise<void>` — `POST /auth/login`, guarda `Session`.
  - `logout(): void` — `clearSession()`.
  - `<AuthGuard>{children}</AuthGuard>` — sin sesión válida: `router.replace("/login")` y no renderiza hijos; con sesión: `GET /auth/me` una vez, error distinto de 401 → `ApiErrorBanner` a pantalla completa con reintentar.
  - `useCurrentUser(): CurrentUser`

- [ ] **Step 1:** Login: quitar valores precargados (email y `"••••••••"`) y el checkbox "recordarme" (la sesión es de pestaña por contrato). Submit deshabilitado mientras envía; error 401 → "Email o contraseña incorrectos"; otro error → `ApiErrorBanner`. Éxito → `router.replace("/dashboard")`. Si ya hay sesión válida al entrar, ir al dashboard.
- [ ] **Step 2:** Layout: `<AuthGuard><StoreProvider>…</StoreProvider></AuthGuard>` (el store se quita en Task 17).
- [ ] **Step 3:** Sidebar "Cerrar sesión" → `logout()` y navegar a `/login`. Topbar/Sidebar muestran `useCurrentUser().fullName` donde hoy hay un nombre fijo.
- [ ] **Step 4: Verificar a mano** contra la API local: credenciales malas → mensaje; buenas → dashboard; borrar `m3b_session` en DevTools y navegar → vuelve a `/login`; editar `expiresAt` al pasado y recargar → `/login`; API apagada → mensaje "No se pudo conectar…".
- [ ] **Step 5:** `npm run build`, `npm run lint`, `npm test` → OK.
- [ ] **Step 6: Commit** — `feat(auth): login JWT y guard de sesión`

---

### Task 5: Categorías de producto

**Files:** Modify `src/app/(admin)/configuracion/producto/page.tsx`

**Interfaces:** Consumes `usePagedList<ProductCategory>`, `api.post/patch/del`, `ApiErrorBanner`, `Pager`, `ConfirmDeleteModal`.

Endpoints: `GET /product-categories` (sort `name` asc, `search`), `POST {name}`, `PATCH /{id} {name}`, `DELETE /{id}`. Mostrar `productCount`. Se agrega renombrar (hoy no existe). No hay `GET /{id}`.

- [ ] **Step 1: Implementar.** Quitar `useStore`. Después de cada escritura OK → `reload()`. Error de escritura → banner dentro del modal sin cerrarlo.
- [ ] **Step 2: Verificar a mano:** crear, renombrar, buscar, borrar una sin productos (204) y una con productos (ver 409 del backend).
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(catalogo): categorías de producto contra la API`

---

### Task 6: Proveedores

**Files:** Modify `src/app/(admin)/proveedores/page.tsx`

Endpoints: CRUD `/suppliers`. Lista: sort por defecto `name` asc; columnas ordenables según §4 (`name`, `type`, `contactName`, `city`, `category`, `productCount`, `lastActivityOn`); `search` server-side. Formulario agrega `type` (select `SupplierType` con `labels`) y `active`. Muestra `productCount` y `lastActivityOn` (fecha, sin conversión de zona). Filtros del `FilterPanel` → `filters` (ej. `type EQUALS`, `active EQUALS`).

PATCH: enviar solo los campos que cambiaron; un campo vaciado se manda como `""` (borra); no mandar `null`.

- [ ] **Step 1: Implementar** (sin `useStore`; `Pager`; `ApiErrorBanner`; botón guardar deshabilitado mientras envía).
- [ ] **Step 2: Verificar a mano:** alta con solo `name`; editar y **vaciar el teléfono** → recargar → queda vacío; ordenar por ciudad; buscar "córdoba" (no-ASCII); filtro por tipo; borrar proveedor por defecto de un producto con stock → 409 visible.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(proveedores): CRUD contra la API`

---

### Task 7: Productos y variantes

**Files:** Modify `src/app/(admin)/productos/page.tsx` (si supera lo manejable, extraer los modales a `src/app/(admin)/productos/ProductFormModal.tsx` y `VariantsModal.tsx`)

**Interfaces:** Consumes `usePagedList<Product>`, `useOptions<ProductCategory>("/product-categories")`, `useOptions<Supplier>("/suppliers")`, `useApiResource`, `api.*`.

Endpoints: `GET /products` (sort por defecto `name`; `search` cubre nombre, subtítulo, proveedor y SKUs de variantes), `GET /products/{id}`, `POST /products`, `PATCH /products/{id}`, `DELETE /products/{id}`, `POST /products/{id}/variants`, `PATCH /variants/{id}`, `DELETE /variants/{id}`, `GET /variants/{id}/cost-history` (paginado).

Reglas:
- Alta: `{name, subtitle, categoryId, minStock, defaultSupplierId}` + **o bien** `sku, price, cost, initialStock` (simple) **o bien** `variants: [{name, sku, price, cost, initialStock}]`, nunca ambos. El formulario tiene un toggle "Tiene variantes" que decide cuál se envía.
- Edición del producto: `PATCH` con `{name, subtitle, categoryId, minStock, defaultSupplierId, active}`; `subtitle: ""` borra, `null` conserva. Precio/costo/SKU se editan por variante (`PATCH /variants/{id}`; `sku: ""` borra). Un producto simple tiene una variante: su edición de precio/costo/SKU va a esa variante.
- `onHand`, `status`, `hasVariants` vienen del servidor; se elimina todo cálculo local de stock/estado.
- Historial de costo: desde la fila de una variante, modal paginado con `effectiveAt` (instante local), `unitCost`, `source` (label), `createdBy`.
- Filtros: categoría (`categoryId EQUALS`), estado (`status IN`), activo (`active EQUALS`).

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** alta simple y alta con 2 variantes (ambas visibles con stock inicial); intentar enviar ambas formas a la vez no es posible desde la UI; editar precio de una variante → aparece en historial de costo si cambió el costo; **vaciar subtítulo** → queda vacío; desactivar producto; borrar variante con stock → 409; borrar la última variante → 409; borrar producto con stock → 409 con mensaje; buscar por SKU.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(productos): productos y variantes contra la API`

---

### Task 8: Stock, reposición y ajustes

**Files:** Modify `src/app/(admin)/stock/StockContent.tsx` (extraer `RestockModal.tsx` y `AdjustmentModal.tsx` en la misma carpeta si ayuda)

**Interfaces:** Consumes `usePagedList<StockRow>`, `usePagedList<StockMovement>`, `useApiResource<StockSummary>`, `useOptions` de `/suppliers`, `/expense-categories`, `/payment-methods`, `/financial-accounts`, `instantRangeCriteria`.

Endpoints: `GET /stock` (sort por defecto `productName`), `GET /stock/summary` (KPIs: `totalUnits`, `costValuation`, `lowCount`, `outCount`), `GET /stock/movements` (sort por defecto `movedAt` desc; rango de fechas con `instantRangeCriteria("movedAt", from, to)`), `POST /stock/restocks`, `POST /stock/adjustments`.

- Reposición: `{variantId, quantity, unitCost, supplierId?, receivedAt?, notes?, expenseCategoryId, installments?, firstDueDate?, payFirstNow?: {paymentMethodId, accountId?, paidAt?}}`. `unitCost` reemplaza al viejo `listPrice`. `expenseCategoryId` obligatorio. Cuotas y "pagar la primera ahora" opcionales. Respuesta: mostrar `onHand` nuevo y, si `expenseId`, aviso "Gasto #id registrado".
- Ajuste (nuevo): `{variantId, type: "DAMAGE" | "ADJUSTMENT", quantity, notes}`; `DAMAGE` cantidad > 0, `ADJUSTMENT` con signo y ≠ 0; `notes` obligatorio, ≤ 500.
- Los query params actuales de `/stock?...` que usa la página se conservan para preseleccionar (ej. venir desde Productos).
- Después de reponer/ajustar: `reload()` de la lista, del resumen y de movimientos.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** reposición sin cuotas → `onHand` sube, movimiento `PURCHASE_RECEIPT`, gasto creado (verlo en Swagger `GET /expenses/{id}`); reposición en 3 cuotas con primera pagada; merma de más unidades que el stock → 409; ajuste negativo; filtro de movimientos por día; KPIs coinciden con `/stock/summary`.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(stock): stock, reposiciones y ajustes contra la API`

---

### Task 9: Medios de pago y cuentas financieras

**Files:** Rewrite `src/app/(admin)/configuracion/venta/page.tsx`; Modify `src/components/layout/Sidebar.tsx` (renombrar el link de `/configuracion/venta` a "Cobros" o "Medios de pago")

Endpoints: CRUD `/payment-methods` (`{name, surchargePct, defaultAccountId}`, los tres obligatorios al crear; PATCH `null` conserva; mostrar `code`, `defaultAccountName`) y CRUD `/financial-accounts` (`{name, type}`, `type` con `accountTypeLabel`). Se elimina el ABM de "Tipos de venta" (en la API es el enum fijo `SaleType`).

- [ ] **Step 1: Implementar** dos secciones en la misma página.
- [ ] **Step 2: Verificar a mano:** crear cuenta; crear medio con recargo 10 y esa cuenta; `surchargePct` 10.555 → 400 visible; borrar cuenta que es default de un medio → 409.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(config): medios de pago y cuentas contra la API`

---

### Task 10: Lista de clientes

**Files:** Modify `src/app/(admin)/clientes/page.tsx`

Endpoints: `GET /customers` (sort por defecto `fullName`; `search` cubre nombre, dni, teléfono, email), `POST`, `PATCH /{id}`, `DELETE /{id}`. Formulario: `firstName` (obligatorio), `lastName`, `dni` (7–8 dígitos; el backend acepta puntos), `phone`, `email`, `notes`. Columnas del servidor: `orderCount`, `totalPurchased`, `totalPaid`, `outstanding`, `lastPurchaseAt` (instante local). Filtro "con deuda" → `outstanding GREATER_THAN 0`.

PATCH: enviar solo las claves cambiadas; campo vaciado se manda como `null` (borra).

- [ ] **Step 1: Implementar.** Las iniciales se derivan de `fullName` en el render.
- [ ] **Step 2: Verificar a mano:** alta con DNI `30.123.456` → se guarda `30123456`; DNI duplicado → 409; **vaciar email** → queda vacío; ordenar por deuda; borrar con deuda → 409.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(clientes): lista y ABM contra la API`

---

### Task 11: Detalle de cliente, cuenta corriente y cobros

**Files:** Modify `src/app/(admin)/clientes/detalle/ClienteDetailContent.tsx`

**Interfaces:** Consumes `useApiResource<Customer>`, `usePagedList<AccountEntry>("/customers/{id}/account")`, `usePagedList<Sale>("/sales", {filters: [{field: "customerId", operator: "EQUALS", value: id}]})`, `useOptions<PaymentMethod>`, `useOptions<FinancialAccount>`.

- Encabezado y totales desde `GET /customers/{id}`.
- Cuenta corriente desde `/account`: columnas `at` (local), `description`, `debit`, `credit`, `balance` (saldo del servidor, no se recalcula).
- Cobro: `POST /customers/{id}/payments {amount, paymentMethodId, accountId?, paidAt?, notes?, saleId?}`. Sin `saleId` = FIFO. "Saldar todo" = cobro por `outstanding`. Cuenta por defecto = la del medio elegido (mostrarla preseleccionada, editable).
- Anular cobro: desde una fila `PAYMENT` → `DELETE /payments/{id}` con `ConfirmDeleteModal`; 409 visibles (pago de venta de mostrador, pago con recargo).
- Después de cobrar/anular → `reload()` de cliente, cuenta y ventas.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** cobro parcial FIFO y saldo baja; cobro a una venta puntual; cobro mayor a la deuda → 409; "Saldar todo" deja `outstanding` 0; anular un cobro → la deuda vuelve; `paidAt` futuro → 400; **doble clic en "Registrar cobro"** → un solo cobro.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(clientes): cuenta corriente y cobros contra la API`

---

### Task 12: Lista de ventas

**Files:** Modify `src/app/(admin)/ventas/page.tsx`

Endpoints: `GET /sales` (sort por defecto `soldAt` desc; `search` cubre notas y nombre de cliente; filtros: `type`, `status` (`IN` sobre `PaymentStatus`), rango `instantRangeCriteria("soldAt", …)`, cliente), `GET /sales/{id}` (detalle en modal: líneas, ajustes, pagos, `grossTotal`, `adjustmentTotal`, `totalDue`, `totalPaid`, `outstanding`, `grossMargin`), `PATCH /sales/{id} {notes}`, `POST /sales/{id}/cancel`.

- **Se elimina la edición de ítems y el borrado.** En su lugar: "Editar notas" y "Cancelar venta" (confirmación que explica que devuelve stock y anula los pagos). Para corregir ítems: cancelar y registrar de nuevo (texto de ayuda con link a `/ventas/nueva`).
- Venta sin cliente: mostrar `notes` como nombre ("Consumidor final" si vacío).

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** filtro por día cerca de medianoche (venta a las 23:30 local aparece en ese día); cancelar → estado `CANCELLED` y stock repuesto (ver `/stock`); cancelar de nuevo → 409; venta cuyo pago cubre otras ventas → 409 al cancelar; **doble clic en "Cancelar venta"** → una sola request.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(ventas): lista, notas y cancelación contra la API`

---

### Task 13: Estimador de venta (lógica pura)

**Files:**
- Create: `src/lib/saleEstimate.ts`
- Test: `src/lib/saleEstimate.test.ts`

**Interfaces:**
- Produces:
  - `round2(n: number): number` — HALF_UP a 2 decimales, vía `Number(Math.round(Number(n + "e2")) + "e-2")` (evita el error de `1.005 * 100`).
  - `type DiscountInput = { kind: "amount" | "percent"; value: number } | null`
  - `interface EstimateLine { unitPrice: number; quantity: number }`
  - `interface EstimatePayment { amount: number; surchargePct: number }`
  - `interface SaleEstimate { gross: number; discount: number; surcharge: number; totalDue: number; paidBase: number; remaining: number }`
  - `estimateSale(lines: EstimateLine[], discount: DiscountInput, payments: EstimatePayment[]): SaleEstimate` — `gross = round2(Σ unitPrice×quantity)`; `discount = percent ? round2(gross × value / 100) : round2(value)`; `surcharge = Σ round2(amount × surchargePct / 100)` (por parte, como el backend); `totalDue = round2(gross − discount + surcharge)`; `paidBase = round2(Σ amount)`; `remaining = round2(gross − discount − paidBase)` (el backend compara pagos contra el total **antes** de recargos).

- [ ] **Step 1: Tests que fallan:**

```ts
test("round2 HALF_UP", () => {
  assert.equal(round2(1.005), 1.01); assert.equal(round2(10.555), 10.56); assert.equal(round2(2.675), 2.68);
});
test("estimateSale con % y recargo", () => {
  assert.deepEqual(
    estimateSale([{ unitPrice: 1000, quantity: 2 }, { unitPrice: 333.33, quantity: 3 }],
      { kind: "percent", value: 10 }, [{ amount: 1000, surchargePct: 10 }]),
    { gross: 2999.99, discount: 300, surcharge: 100, totalDue: 2799.99, paidBase: 1000, remaining: 1699.99 });
});
test("estimateSale sin descuento ni pagos", () => {
  assert.deepEqual(estimateSale([{ unitPrice: 50, quantity: 1 }], null, []),
    { gross: 50, discount: 0, surcharge: 0, totalDue: 50, paidBase: 0, remaining: 50 });
});
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(ventas): estimador de total de venta`

---

### Task 14: Nueva venta

**Files:** Modify `src/app/(admin)/ventas/nueva/page.tsx` (extraer subcomponentes a la misma carpeta si ayuda: carrito, pagos, selector de cliente)

**Interfaces:** Consumes `estimateSale`, `round2` (Task 13); `useOptions<PaymentMethod>`; `usePagedList<Product>` o `api.getPage` con `search` para el buscador; `api.getOne<VariantLookup>("/variants/lookup", {code})` para el escáner; `usePagedList<Customer>`/`api.getPage` con `search` para elegir cliente; `api.post<Customer>("/customers")` para alta rápida; `api.post<Sale>("/sales")`.

Cuerpo de `POST /sales`:
`{customerId?, soldAt?, type, notes?, lines: [{variantId, quantity}], adjustments: [{type: "DISCOUNT", amount, notes}], payments: [{paymentMethodId, amount, accountId?, notes?}]}`
- `type` = select `SaleType` con `saleTypeLabel` (reemplaza los "tipos de venta" del store).
- Descuento: el usuario elige monto o %; se envía `amount = estimateSale(...).discount` (ya redondeado). Sin descuento → `adjustments: []`.
- `payments[i].amount` = base sin recargo; el backend agrega el recargo. En regalo/sorteo (`GIFT`, `GIVEAWAY`) no se envían pagos y se ocultan.
- Venta sin cliente: debe pagarse completa (deshabilitar confirmar si `remaining > 0` y no hay cliente, con explicación); el nombre libre va en `notes`.
- Panel de totales rotulado **"Estimado"** con `estimateSale`. Tras el 201, pantalla de confirmación con las cifras del servidor (`grossTotal`, `adjustmentTotal`, `totalDue`, `totalPaid`, `outstanding`, `paymentStatus`) y, si `totalDue` ≠ estimado, una línea "Diferencia con el estimado: $X".
- Precio unitario mostrado = `variant.price` del servidor; no editable (el backend lo toma de la variante).

- [ ] **Step 1: Implementar.** Quitar `useStore`.
- [ ] **Step 2: Verificar a mano:** escanear SKU existente / inexistente (404 → "Código no encontrado"); venta a cliente con pago parcial → `PARTIAL`; venta de mostrador sin pagar completo → no se puede confirmar (y si se fuerza por API, 409); pago con tarjeta con recargo → estimado = servidor; descuento 10% sobre $2999.99 → se envía 300 y no hay 400; regalo sin pagos → `N/A`; **doble clic en "Confirmar venta"** → una sola venta; stock baja en `/stock`.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(ventas): nueva venta contra la API con total estimado`

---

### Task 15: Categorías de gasto

**Files:** Modify `src/app/(admin)/gastos/categorias/page.tsx`, `src/app/(admin)/configuracion/gastos/page.tsx`

Endpoints: CRUD `/expense-categories` (`{name, description?, isBusiness?, isCapex?}`; PATCH mapa de claves cambiadas, `null` borra `description`). Mostrar `expenseCount`. En `configuracion/gastos` se elimina el ABM de "Tipos de gasto" (en la API es el enum fijo `ExpenseKind`, `FIXED`/`VARIABLE`); si la página queda solo con categorías, que muestre lo mismo que `gastos/categorias` reutilizando un componente `src/components/expenses/ExpenseCategoriesManager.tsx` en ambas rutas.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** crear con `isBusiness`; **vaciar descripción** → queda vacía; borrar con gastos → 409.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(gastos): categorías de gasto contra la API`

---

### Task 16: Gastos y eliminación de Ingreso/Egreso

**Files:**
- Modify: `src/app/(admin)/gastos/page.tsx`, `src/components/layout/Sidebar.tsx` (quitar links ~169 y ~181)
- Delete: `src/app/(admin)/gastos/ingresos/page.tsx`, `src/app/(admin)/gastos/egresos/page.tsx`

Endpoints: `GET /expenses` (sort por defecto `incurredOn` desc; filtros: `categoryId`, `kind`, `status IN`, `supplierId`, rango `dateRangeCriteria("incurredOn", …)`), `GET /expenses/summary?from=&to=` (KPIs y desglose por categoría con el mismo rango), `GET /expenses/{id}` (detalle con cuotas y pagos), `POST /expenses`, `PATCH /expenses/{id}` (solo encabezado: `categoryId, kind, supplierId, description, incurredOn, firstDueDate?, notes`; `null` borra opcionales), `DELETE /expenses/{id}`, `POST /expenses/{id}/installments/{no}/payments {paymentMethodId, accountId?, paidAt?, amount?, notes?}` (sin `amount` = lo que debe la cuota), `DELETE /expense-payments/{id}`.

- Alta: `{categoryId, kind?, supplierId?, description, incurredOn, amount, installments? (1..24), firstDueDate?, notes?, payFirstNow?}`. En edición, monto y cuotas se muestran solo lectura.
- Se elimina todo lo de `type: "Ingreso" | "Egreso"`, el toggle y los links "Ingresos"/"Egresos" del sub-menú y del Sidebar.
- Gasto creado por reposición (`restockId` ≠ null): mostrar link "Ver reposición" a `/stock` y no ofrecer borrar (el backend da 409).

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** gasto en 3 cuotas con `firstDueDate` → 3 vencimientos mensuales; pagar cuota 1 sin monto → `PAID` esa cuota; pagar de nuevo → 409; anular el pago → vuelve a `PENDING`; borrar gasto con pagos → 409; resumen del mes coincide con la lista; `/gastos/ingresos` ya no existe en el build; **vaciar notas** al editar → quedan vacías.
- [ ] **Step 3:** build/lint/test OK. **Commit** — `feat(gastos): gastos y cuotas contra la API; quitar Ingreso/Egreso`

---

### Task 17: Dashboard, notificaciones, configuración general y limpieza

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`, `src/components/dashboard/RecentSalesTable.tsx`, `src/components/dashboard/StockAlertsCard.tsx`, `src/components/layout/NotificationsPopover.tsx`, `src/app/(admin)/configuracion/page.tsx`, `src/app/(admin)/layout.tsx`, `CLAUDE.md`
- Delete: `src/lib/store.tsx`, `src/lib/data.ts`, `src/lib/types.ts`, `src/components/dashboard/BalanceChart.tsx` y `CategoryDonut.tsx` solo si quedan sin uso (si no, dejarlos y reemplazar su uso por `PendingApi`)

- Dashboard: `RecentSalesTable` ← `GET /sales?length=5` (sort `soldAt` desc); `StockAlertsCard` ← `GET /stock` con `status IN [LOW, OUT]`; KPI de stock ← `/stock/summary`. KPIs financieros, gráfico de balance y donut → `<PendingApi>` con `GET /api/reports/summary`, `/reports/monthly-balance`, `/reports/sales-by-category`.
- Notificaciones: lista armada con `GET /stock` (`status IN [LOW, OUT]`) y `GET /expenses` (`status EQUALS OVERDUE`); ids estables `stock-<variantId>` y `expense-<id>`; el estado leído/no leído sigue en `localStorage` (try/catch) como hoy.
- `/configuracion` (general): `<PendingApi title="Datos del negocio" endpoint="GET/PUT /api/settings" />`.
- Layout: quitar `StoreProvider`.
- Borrar store, seed y tipos viejos; `grep -r "@/lib/store\|@/lib/data\|@/lib/types" src` debe dar vacío.
- `CLAUDE.md`: reemplazar la sección "State lives in one React context" y "API layer is prepared but unused" por: datos vía `src/lib/api.ts` contra m3b-api, sesión JWT en `sessionStorage`, hooks en `src/lib/useApi.ts`, tipos en `src/lib/apiTypes.ts`, `npm test` para la lógica pura; quitar la regla de `DATA_VERSION`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar a mano:** dashboard carga sin errores con la API; notificaciones muestran un producto en `LOW` y un gasto vencido; marcar leído persiste al recargar; con la API apagada cada bloque muestra el banner de error (no datos viejos).
- [ ] **Step 3:** `npm run build`, `npm run lint`, `npm test` → OK; `grep` anterior vacío.
- [ ] **Step 4: Commit** — `feat(dashboard): dashboard y notificaciones contra la API; quitar store local`

---

### Task 18: Recorrido final

- [ ] **Step 1:** Con la base vacía de datos de negocio (solo seeds), recorrer de punta a punta: login → categoría → proveedor → producto con variantes → reposición en cuotas → cliente → venta con pago parcial con tarjeta → cobro FIFO → cancelar otra venta → gasto y pago de cuota → dashboard y notificaciones → logout.
- [ ] **Step 2:** Anotar en `docs/superpowers/specs/2026-10-21-api-integration-findings.md` cada cosa que no encajó con la API (incluye: falta un endpoint de cotización de venta, D8). Commit — `docs: hallazgos de la integración con la API`.
