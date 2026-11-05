# Asistente de IA y guía de usuario: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** conectar el admin al chat de datos y a la guía de usuario del backend:

- cliente HTTP y WebSocket;
- estado puro y hooks;
- estructura mínima de UI: pestaña o botón flotante y `/configuracion/guia`.

**Arquitectura:**

- El protocolo del socket (URL, cierre, backoff, dispatcher) y el estado de un turno de respuesta son módulos puros. No importan nada con `@/` ni del navegador, así `node --test` los puede cargar.
- Sobre ellos va un singleton `socket` con el patrón de `feedback.ts`, montado por un `SocketProvider` dentro de `AuthGuard`, y los hooks de React.
- La UI es estructura sin diseño.

**Stack:** Next.js 16 (export estático), React 19, Tailwind v4, `node:test` (Node 24, con type stripping) y el WebSocket nativo del navegador. No se agregan dependencias.

**Spec:** [docs/superpowers/specs/2026-11-05-ai-assistant-design.md](../specs/2026-11-05-ai-assistant-design.md). Leelo entero antes de empezar: este plan sale de él.

## Restricciones globales

- El token va **solo** en el primer mensaje `{"type":"auth","token":"..."}`. Nunca en la URL.
- Un cierre 1008 limpia la sesión y redirige a `${env.basePath}/login/`. Nunca se reconecta con el mismo token.
- Backoff: arranca en 1000 ms, duplica en cada intento, tiene un tope de 30000 ms y se resetea con cada `auth.ok`.
- Límites del cliente:
  - pregunta: trim no vacío y ≤ 2000 caracteres;
  - nombre de sección: trim no vacío y ≤ 120 caracteres;
  - archivo: ≤ 10 MB (`10 * 1024 * 1024` bytes).
- Las preguntas usan `notify: { silent: true }`. El error se ve en el panel, sin toast.
- Se muestra siempre el `message` del `ApiError`, que ya viene en español.
- Los textos de la UI van en español. Los colores, con los hex que ya usa el archivo vecino (`#9C5A2E`, `#E7DFD2`, `#231E1A`, `#7A6F63`, `#F7F3EC`, `#FBF8F2`).
- Los módulos testeados (`*.test.ts` y lo que importan) usan imports relativos con extensión `.ts`, y solo `import type` hacia `apiTypes.ts`.
- No se guarda historial ni respuestas en storage. Lo persistido se lee siempre por HTTP.
- Los commits van sin líneas `Co-Authored-By` ni de sesión (preferencia del usuario). Se trabaja en la rama `feat/ai-assistant`, no en `main`.

## Foco de la revisión

1. **Eventos que llegan antes del 202.** El turno no puede quedar "escribiendo" para siempre ni perder el principio del texto. Lo cubre el test `buffer: eventos antes del 202 se aplican al aceptar` (Tarea 3).
2. **Un `done` propio que llega desde el buffer** no puede disparar la recarga "de otra pestaña". Lo cubre el test `buffer: done propio no marca reload` (Tarea 3).
3. **Un evento de la guía** no puede tocar el turno del chat, ni al revés, aunque los `requestId` sean distintos. Lo cubre el test `ignora eventos de otro source` (Tarea 3).
4. **Un mensaje del socket con `payload` faltante o JSON roto** no puede tirar el dispatcher, ni cortar a los otros handlers si uno falla. Lo cubre el test `dispatcher: handler que tira no corta a los demás` (Tarea 2).
5. **`stop()` durante una reconexión pendiente** (logout) no puede reabrir el socket. Lo cubre el test `closeAction después de stop → none` (Tarea 2). En la Tarea 4 se agrega además el `clearTimeout`.

---

### Tarea 1: Rama, multipart en `api.ts`, tipos y cliente del asistente

**Archivos:**
- Modificar: `src/lib/api.ts`
- Modificar: `src/lib/apiTypes.ts`
- Crear: `src/lib/assistantApi.ts`

**Interfaces:**

Produce, en `api.ts`:

- `send` y `request` aceptan un `body` que puede ser `FormData`. En ese caso no ponen `Content-Type` y lo mandan tal cual.
- Se exportan `api.postForm<T>(path, form: FormData, notify?)` y `api.putForm<T>(path, form: FormData, notify?)`.
- Se exporta `expireSession(): void`, que es el `clearSession()` más la redirección a `/login/` que hoy está dentro del manejo del 401. El 401 pasa a llamarla.

Produce, en `apiTypes.ts`:

- `ChatSummary`, `MessageView`, `ChatView`, `GuideSectionView` y `AskAccepted`, exactos como en la spec.
- `AssistantSource = "chat" | "guide"`.
- `AssistantDelta`, `AssistantDone` y `AssistantError`.

Produce, en `assistantApi.ts`:

```ts
export const MAX_QUESTION = 2000, MAX_SECTION_NAME = 120, MAX_FILE_BYTES = 10 * 1024 * 1024;
export const assistantApi = {
  createChat(): Promise<ChatSummary>,                        // POST /chats, quiet
  deleteChat(id: number): Promise<void>,                     // DELETE /chats/{id}, success "Chat eliminado"
  getChat(id: number): Promise<ChatView>,                    // GET /chats/{id}
  askChat(id: number, question: string): Promise<AskAccepted>, // POST /chats/{id}/messages, silent
  askGuide(question: string): Promise<AskAccepted>,          // POST /guide/ask, silent
  listSections(): Promise<GuideSectionView[]>,               // GET /guide/sections (body {data: [...]}, usar api.getOne)
  getSection(id: number): Promise<GuideSectionView>,
  createSection(name: string, file: File): Promise<GuideSectionView>,       // postForm, success "Sección cargada"
  updateSection(id: number, p: { name?: string; file?: File }): Promise<GuideSectionView>, // putForm, solo los campos presentes, success "Sección actualizada"
  deleteSection(id: number): Promise<void>,                  // success "Sección eliminada"
};
```

La lista de chats no pasa por acá: la arma `usePagedList("/chats", ...)` (Tarea 5).

- [ ] **Paso 1:** `git checkout -b feat/ai-assistant`.
- [ ] **Paso 2:** implementar los cambios de `api.ts`, `apiTypes.ts` y `assistantApi.ts` de arriba.
- [ ] **Paso 3:** correr `npm run build && npm test && npm run lint`. Tiene que compilar y los tests existentes tienen que pasar.
- [ ] **Paso 4:** commit con el mensaje `feat(asistente): cliente HTTP tipado y soporte multipart`.

### Tarea 2: Protocolo del socket (puro)

**Archivos:**
- Crear: `src/lib/socketProtocol.ts`. Sin imports.
- Test: `src/lib/socketProtocol.test.ts`

**Interfaces:**

```ts
export type CloseAction = "none" | "login" | "reconnect";
export function socketUrl(apiUrl: string): string;          // http→ws, https→wss; path terminado en /api → /ws, si no, se agrega /ws
export function closeAction(code: number, stopped: boolean): CloseAction; // stopped → none; 1008 → login; resto → reconnect
export function backoffDelay(attempt: number, r?: number): number; // Math.min(30000, 1000 * 2 ** attempt * (0.75 + r * 0.5)), r por defecto Math.random()
export interface ServerMessage { type: string; payload: unknown }
export function createDispatcher(): {
  on(type: string, handler: (payload: unknown) => void): () => void;
  dispatch(raw: string): ServerMessage | null; // JSON inválido o sin type string → null; cada handler en try/catch
};
```

- [ ] **Paso 1: escribir los tests que fallan.**

```ts
test("socketUrl", () => {
  assert.equal(socketUrl("http://localhost:8080/api"), "ws://localhost:8080/ws");
  assert.equal(socketUrl("https://x.com/api"), "wss://x.com/ws");
  assert.equal(socketUrl("https://x.com/v1/api"), "wss://x.com/v1/ws");
  assert.equal(socketUrl("https://x.com"), "wss://x.com/ws");
});
test("closeAction", () => {
  assert.equal(closeAction(1008, false), "login");
  assert.equal(closeAction(1006, false), "reconnect");
  assert.equal(closeAction(1000, false), "reconnect");
});
test("closeAction después de stop → none", () => assert.equal(closeAction(1008, true), "none"));
test("backoffDelay crece y respeta el tope", () => {
  assert.equal(backoffDelay(0, 0.5), 1000);
  assert.equal(backoffDelay(3, 0.5), 8000);
  assert.equal(backoffDelay(10, 1), 30000);
  assert.ok(backoffDelay(1, 0) >= 1500 && backoffDelay(1, 1) <= 2500);
});
test("dispatcher: rutea por type, ignora desconocidos y JSON roto", () => {
  const d = createDispatcher(); const got: unknown[] = [];
  const off = d.on("assistant.delta", (p) => got.push(p));
  d.dispatch('{"type":"assistant.delta","payload":{"text":"a"}}');
  d.dispatch('{"type":"otro","payload":{}}');
  assert.equal(d.dispatch("no-json"), null);
  assert.equal(d.dispatch('{"payload":{}}'), null);
  off(); d.dispatch('{"type":"assistant.delta","payload":{"text":"b"}}');
  assert.deepEqual(got, [{ text: "a" }]);
});
test("dispatcher: handler que tira no corta a los demás", () => {
  const d = createDispatcher(); let ok = 0;
  d.on("x", () => { throw new Error("boom"); }); d.on("x", () => ok++);
  d.dispatch('{"type":"x"}');
  assert.equal(ok, 1);
});
```

- [ ] **Paso 2:** correr `npm test`. Tiene que fallar porque no existe `./socketProtocol.ts`.
- [ ] **Paso 3:** implementar las firmas de arriba. Si falta el `payload`, se pasa `{}`.
- [ ] **Paso 4:** correr `npm test`. Tiene que pasar todo.
- [ ] **Paso 5:** commit con el mensaje `feat(socket): protocolo puro (url, cierre, backoff, dispatcher)`.

### Tarea 3: Estado de un turno de respuesta (puro)

**Archivos:**
- Crear: `src/lib/assistantTurn.ts`. Solo `import type` desde `./apiTypes.ts`.
- Test: `src/lib/assistantTurn.test.ts`

**Interfaces:**

```ts
export interface Turn { requestId: string; question: string; text: string; status: "streaming" | "done" | "error";
  messageId?: number | null; sections?: string[]; error?: string }
export type AssistantEvent =
  | { type: "assistant.delta"; payload: AssistantDelta }
  | { type: "assistant.done"; payload: AssistantDone }
  | { type: "assistant.error"; payload: AssistantError };
export interface TurnState { awaiting: boolean; turn: Turn | null; buffer: AssistantEvent[]; reload: boolean }
export interface TurnCtx { source: AssistantSource; chatId: number | null }

export const initialTurnState: TurnState;                     // {awaiting:false, turn:null, buffer:[], reload:false}
export function beginAsk(s: TurnState): TurnState;            // awaiting:true, buffer:[], reload:false
export function acceptAsk(s: TurnState, requestId: string, question: string, ctx: TurnCtx): TurnState;
  // turn streaming vacío; aplica en orden los eventos del buffer con ese requestId; descarta el resto; awaiting:false
export function failAsk(s: TurnState): TurnState;             // awaiting:false, buffer:[]
export function applyEvent(s: TurnState, ev: AssistantEvent, ctx: TurnCtx): TurnState;
  // payload.source ≠ ctx.source → s sin cambios
  // awaiting → se agrega al buffer
  // turn streaming con el mismo requestId → delta concatena text; done → status done + messageId + sections; error → status error + error=message
  // si no: source chat && chatId === ctx.chatId && type done → reload:true; otro caso → s sin cambios
export function interrupt(s: TurnState, message: string): TurnState; // turn streaming → error con message; awaiting → failAsk
export const isBusy = (s: TurnState) => s.awaiting || s.turn?.status === "streaming";
export function chatMessages(server: MessageView[], turn: Turn | null): MessageView[];
  // sin turn o con status error → server
  // done con messageId presente en server → server (la recarga ya lo trae)
  // si no → server + {id:-1, role:"USER", content:question} + {id: messageId ?? -2, role:"ASSISTANT", content:text}; createdAt = new Date().toISOString()
```

- [ ] **Paso 1: escribir los tests que fallan.** Usar el helper `ev(type, payload)` y `ctx = { source: "chat", chatId: 7 }`.
  - `delta concatena en orden`: `acceptAsk("r1")`, después los deltas `"Ho"`, `"la"` → `turn.text === "Hola"` y `status === "streaming"`.
  - `ignora delta de otro requestId`: un delta `r2` deja el estado igual por referencia (`assert.equal(next, s)`).
  - `ignora eventos de otro source`: un delta `{source:"guide", requestId:"r1"}` con el ctx del chat → sin cambios.
  - `done guarda messageId y sections y libera`: un done `{messageId: 42, sections: []}` → `status === "done"`, `messageId === 42` e `isBusy === false`.
  - `error marca el turno`: un error con `message: "Sin cuota"` → `status === "error"`, `error === "Sin cuota"` y `chatMessages([m1], turn)` igual a `[m1]`.
  - `done ajeno del mismo chat → reload`: sin turno, un done `{requestId:"otro", chatId:7}` → `reload === true`. Con `chatId: 8` → `false`.
  - `buffer: eventos antes del 202 se aplican al aceptar`: `beginAsk`, el delta `"Ho"` de r1, un delta de rX y el done de r1, y recién ahí `acceptAsk("r1")` → `text === "Ho"`, `status === "done"` y `buffer` vacío.
  - `buffer: done propio no marca reload`: igual que el anterior, y además `reload === false`.
  - `interrupt pasa streaming a error`: después de `acceptAsk`, `interrupt(s, "Se perdió la conexión")` → `status === "error"`.
  - `chatMessages`: mientras hay streaming, agrega 2 mensajes (USER con id -1 y ASSISTANT). Con done y `messageId: 42` ya presente en server, devuelve server tal cual.
- [ ] **Paso 2:** correr `npm test`. Tiene que fallar porque no existe `./assistantTurn.ts`.
- [ ] **Paso 3:** implementar las firmas de arriba.
- [ ] **Paso 4:** correr `npm test`. Tiene que pasar todo.
- [ ] **Paso 5:** commit con el mensaje `feat(asistente): estado puro de un turno con buffer y correlación por requestId`.

### Tarea 4: Singleton del socket y provider

**Archivos:**
- Crear: `src/lib/socket.ts`
- Crear: `src/lib/socketProvider.tsx`
- Modificar: `src/lib/auth.tsx`. `logout()` también llama a `socket.stop()`.
- Modificar: `src/app/(admin)/layout.tsx`. `<SocketProvider>` va como primer hijo de `<AuthGuard>`.

**Interfaces:**

Consume: `socketUrl`, `closeAction`, `backoffDelay` y `createDispatcher` (Tarea 2); `getSession` y `expireSession` (Tarea 1); `env.apiUrl`.

Produce:

```ts
export type SocketStatus = "idle" | "connecting" | "open" | "closed";
export const socket = {
  start(): void,          // idempotente; sin sesión → expireSession()
  stop(): void,           // stopped=true, clearTimeout del reintento pendiente, close(1000)
  on<T>(type: string, handler: (payload: T) => void): () => void,
  onReconnect(l: () => void): () => void, // se dispara en cada auth.ok después del primero desde start()
  status(): SocketStatus,
  subscribe(l: () => void): () => void,   // cambios de status (useSyncExternalStore)
};
export function SocketProvider({ children }: { children: React.ReactNode }): JSX.Element; // useEffect: start() / stop()
```

Comportamiento:

- `onopen`: manda `auth` con `getSession()?.accessToken`. Si no hay token, `expireSession()`.
- `onmessage`: `dispatcher.dispatch(ev.data)`. Un `auth.ok` pone `status = "open"`, `attempt = 0` y, si no es el primero, emite reconnect.
- `onclose`: aplica `closeAction(code, stopped)`:
  - `login` → `expireSession()`;
  - `reconnect` → `setTimeout(connect, backoffDelay(attempt++))`.

- [ ] **Paso 1:** implementar `socket.ts`, `socketProvider.tsx` y los cambios en `auth.tsx` y `layout.tsx`.
- [ ] **Paso 2:** correr `npm run build && npm run lint`. Tiene que compilar sin errores.
- [ ] **Paso 3: verificación manual.** Con `npm run dev` y el backend levantado:
  - en DevTools → Network → WS hay una sola conexión a `/ws` sin token en la URL;
  - el primer frame enviado es el `auth`;
  - llega el `auth.ok`;
  - al reiniciar el backend, reconecta;
  - al cerrar la sesión, no queda ningún socket abierto.
- [ ] **Paso 4:** commit con el mensaje `feat(socket): conexión única con auth, reconexión y 1008`.

### Tarea 5: Hooks

**Archivos:**
- Crear: `src/lib/useAssistant.ts`

**Interfaces:**

Consume: `assistantApi` y las constantes (Tarea 1); `socket` (Tarea 4); todo `assistantTurn` (Tarea 3); `usePagedList` y `useApiResource` de `useApi.ts`. La lista de chats se monta de nuevo cada vez que se vuelve a ella, así trae el título actualizado.

Produce:

```ts
export function useChats(search: string): ReturnType<typeof usePagedList<ChatSummary>> & {
  create(): Promise<ChatSummary>; remove(id: number): Promise<void>; }    // length 20; ambos recargan
export function useChat(id: number | null, onCreated?: (id: number) => void): {
  chat: ChatView | null; messages: MessageView[]; loading: boolean; loadError: ApiError | null;
  busy: boolean; askError: string | null; ask(question: string): Promise<void>; reload(): void; }
export function useGuideAsk(): { turns: Turn[]; busy: boolean; askError: string | null; ask(question: string): Promise<void>; }
export function useGuideSections(): { sections: GuideSectionView[]; loading: boolean; error: ApiError | null; reload(): void;
  get(id: number): Promise<GuideSectionView>;
  create(name: string, file: File): Promise<GuideSectionView>;
  update(id: number, p: { name?: string; file?: File }): Promise<GuideSectionView>;
  remove(id: number): Promise<void>; }
export function validateQuestion(q: string): string | null;      // mensaje en español, o null
export function validateSectionInput(name: string | undefined, file: File | undefined, requireBoth: boolean): { field: "name" | "file"; message: string } | null;
```

Reglas:

- `useChat` mantiene un `TurnState` con `useReducer` o `useState`, y se suscribe a los tres `assistant.*` con `ctx = {source: "chat", chatId: id}`.
- `ask`:
  1. si `validateQuestion` falla, devuelve el error en `askError` sin request;
  2. si está `busy`, no hace nada;
  3. hace `beginAsk`;
  4. si `id === null`, crea el chat y llama a `onCreated(newId)`;
  5. hace `askChat`, y con el 202 llama a `acceptAsk`;
  6. si falla, `failAsk` + `askError = e.message`. El chat creado se queda.
- Cuando el turno pasa a `done` o `reload === true`, hay un `reload()` silencioso del chat. Al terminar, se limpia el `reload`.
- Con `socket.onReconnect`, el turno vuelve a `initialTurnState` y se hace `reload()`.
- Con un `error` del socket, `askError = turn.error`.
- `useGuideAsk` hace lo mismo con `ctx = {source: "guide", chatId: null}` y sin recarga. Antes de `acceptAsk`, el turno anterior pasa a `turns`. `onReconnect` llama a `interrupt(s, "Se perdió la conexión; volvé a preguntar.")`.
- `useGuideSections` usa `useApiResource(() => assistantApi.listSections(), [])`. Las escrituras llaman a `reload` y vuelven a lanzar el `ApiError`.

- [ ] **Paso 1:** implementar `useAssistant.ts`.
- [ ] **Paso 2:** agregar en `src/lib/assistantTurn.test.ts` los tests de las validaciones. Para eso, mover `validateQuestion` y `validateSectionInput` a `assistantTurn.ts`; `useAssistant.ts` las reexporta. Casos:
  - `validateQuestion("  ")` → `!== null`;
  - una pregunta de 2001 caracteres → `!== null`;
  - una de 2000 → `null`;
  - `validateSectionInput("x", { size: 10 * 1024 * 1024 + 1 } as File, true)` → `field === "file"`;
  - `validateSectionInput("", file, true)` → `field === "name"`;
  - `validateSectionInput(undefined, undefined, false)` → `!== null`.
- [ ] **Paso 3:** correr `npm test && npm run build && npm run lint`. Tiene que pasar todo.
- [ ] **Paso 4:** commit con el mensaje `feat(asistente): hooks useChats, useChat, useGuideAsk y useGuideSections`.

### Tarea 6: Pestaña flotante (desktop y tablet) y botón con pantalla completa (mobile)

**Archivos:**
- Crear: `src/components/assistant/AssistantLauncher.tsx`. El contenedor: en `md` y más, una pestaña fija abajo a la derecha y un panel de unos 360×520; por debajo de `md`, un botón redondo, las dos opciones y una vista elegida en `fixed inset-0`.
- Crear: `src/components/assistant/ChatList.tsx`. Búsqueda, `Pager`, "Nuevo chat" y borrar con `ConfirmDeleteModal`. Un título `null` se muestra como "Chat nuevo".
- Crear: `src/components/assistant/ChatConversation.tsx`. Mensajes con `whitespace-pre-wrap`, un indicador "escribiendo…" mientras `busy`, el input y el botón de enviar deshabilitados mientras `busy`, `askError` visible y "Volver".
- Crear: `src/components/assistant/GuideConversation.tsx`. Turnos, con "Secciones consultadas: …" en cada respuesta terminada, y el input y el error igual que en el chat.
- Modificar: `src/app/(admin)/layout.tsx`. Se monta `<AssistantLauncher />` dentro de `SocketProvider`.

**Interfaces:**

Consume: los hooks de la Tarea 5. El estado de la vista es `"choose" | "guide" | "chats" | { chat: number | null }`, local al launcher. Al cerrar o minimizar, vuelve a `"choose"`. Los componentes de vista reciben `onBack(): void`, y `ChatList` también `onOpen(id: number | null)`, donde `null` significa chat nuevo.

- [ ] **Paso 1:** implementar los componentes. Es solo estructura: sin íconos nuevos ni animaciones, más allá de `lucide-react` (`MessageCircle`, `X`, `ArrowLeft`), que ya está instalado.
- [ ] **Paso 2:** correr `npm run build && npm run lint`. Tiene que compilar sin errores.
- [ ] **Paso 3: verificación manual en `npm run dev`.** En desktop:
  1. pestaña → Chatbot → Nuevo chat;
  2. hacer una pregunta: la respuesta va apareciendo en streaming;
  3. mientras dura, no se puede enviar otra;
  4. volver a la lista: el chat aparece con su título;
  5. abrir el mismo chat en otra pestaña del navegador y preguntar desde ahí: la primera recarga al terminar.

  Después, Guía: preguntar y ver las secciones consultadas. En mobile (DevTools a 390 px): botón → opción → pantalla completa → volver.
- [ ] **Paso 4:** commit con el mensaje `feat(asistente): pestaña flotante y vista mobile (estructura sin diseño)`.

### Tarea 7: Sección de la guía en Configuración

**Archivos:**
- Crear: `src/app/(admin)/configuracion/guia/page.tsx`. Importa el manager.
- Crear: `src/components/assistant/GuideSectionsManager.tsx`. Usa la misma `Topbar` y la misma barra de submenús que `ExpenseCategoriesManager`. Muestra:
  - una tabla con nombre, caracteres y `formatInstant(updatedAt)`;
  - "Subir sección": un `Modal` con nombre e `<input type="file" accept="application/pdf">`;
  - por fila: "Ver", que abre un `Modal` con el `content` de `get(id)` en `whitespace-pre-wrap`; "Reemplazar", con el mismo modal y los dos campos opcionales; y "Borrar", con `ConfirmDeleteModal`;
  - el error de validación del cliente o el `ApiError.field` (`name` o `file`), debajo de su campo. Si no trae campo, arriba del formulario;
  - `ApiErrorBanner` para los errores de carga.
- Modificar: agregar el link `Guía de usuario` → `/configuracion/guia` en las barras de submenús de `src/app/(admin)/configuracion/page.tsx`, `producto/page.tsx`, `venta/page.tsx` y `src/components/expenses/ExpenseCategoriesManager.tsx`, más una tarjeta en el grid de `configuracion/page.tsx`. Mirá si `Sidebar.tsx` lista subrutas de configuración; si lo hace, agregala también.

**Interfaces:**

Consume: `useGuideSections` y `validateSectionInput` (Tarea 5); `Modal`, `ConfirmDeleteModal` y `ApiErrorBanner` de `@/components/ui`; `formatInstant` de `@/lib/dateUtils`.

- [ ] **Paso 1:** implementar la página, el manager y los links.
- [ ] **Paso 2:** correr `npm run build && npm run lint`. Tiene que compilar, y `out/configuracion/guia/index.html` tiene que existir.
- [ ] **Paso 3: verificación manual.**
  - subir un PDF con texto: aparece en la lista;
  - "Ver" muestra el texto;
  - repetir el nombre: el error aparece bajo "Nombre" (409);
  - subir un `.png`, o un PDF escaneado: el error aparece bajo "Archivo";
  - un archivo de más de 10 MB: el error aparece sin request (verificar en Network);
  - reemplazar solo el nombre;
  - borrar.
- [ ] **Paso 4:** commit con el mensaje `feat(configuracion): sección para cargar la guía de usuario`.
