# Reporte de QA — vf-gymerp

- **Fecha:** 2026-10-30
- **Commit revisado:** `0e84bcd` ("Añadió página /recepcion")
- **Alcance:** revisión estática del código (frontend `src/`, migraciones `supabase/migrations/`, edge functions `supabase/functions/`) más verificaciones automáticas. No se ejecutó contra la base de datos real. Si existen policies o triggers creados fuera de `supabase/migrations/`, algunos hallazgos podrían cambiar; esos casos se marcan como **SOSPECHA**.
- **Supuestos:** el gimnasio opera en Costa Rica (UTC-6), mientras que el servidor Supabase trabaja en UTC. Un "socio" (rol `member`) solo debe ver sus propios datos. El personal (admin, recepción, coach) solo debe ver los datos de su gimnasio.

## Veredicto: 🔴 NO-GO

Hay 4 fallas SEV-1 de seguridad que permiten tomar cuentas o leer y escribir datos de otros gimnasios **sin ser staff**. También hay 3 flujos centrales rotos para usuarios normales: check-in en `/acceso`, registro de gastos y registro de gimnasio. Esto bloquea cualquier release mientras no se corrija, y conviene revisar si ya se explotó en producción.

## Verificaciones automáticas

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ sin errores (pero `strict: false` y `strictNullChecks: false`, así que detecta poco) |
| `vite build` | ✅ compila; ⚠️ bundle único de 2.4 MB (661 kB gzip), sin code-splitting |
| `vitest run` | ⚠️ 1/1 pasa, pero el único test es un placeholder (`expect(true)`). **La cobertura real es 0** |
| `eslint .` | ❌ 339 errores y 28 warnings: 322 son `no-explicit-any` y 17 `exhaustive-deps`. Los 3 de `rules-of-hooks` son falsos positivos (la función `useTemplate` no es un hook) |

---

## 1. Hallazgos (por severidad)

### 🔴 SEV-1 — Críticos

**[SEV-1 / P1] S1. La edge function `admin-setpw` cambia la contraseña de cualquier usuario sin autenticación**
- **Componente:** `supabase/functions/admin-setpw/index.ts:8-10`
- **Precondición:** tener la anon key, que es pública porque viaja en el bundle del frontend.
- **Pasos:**
  1. Hacer un POST a `/functions/v1/admin-setpw` con la anon key en el header `Authorization`.
  2. Enviar como body `{user_id: <uuid víctima>, password: "x"}`.
- **Actual:** la contraseña se cambia, incluso si la víctima es super_admin.
- **Esperado:** respuesta 401 o 403.
- **Causa:** la función usa el service role y no valida quién la llama. Ningún archivo de `src/` la usa.
- **Fix:** borrar la función ya (`supabase functions delete admin-setpw`).

**[SEV-1 / P1] S2. `create-member-auth` no tiene autenticación y mete al usuario nuevo en `gym_staff` de cualquier gimnasio**
- **Componente:** `supabase/functions/create-member-auth/index.ts:18-70`
- **Pasos:**
  1. Invocar `create-member-auth` con `{cedula, email, first_name, last_name, gym_id: <gimnasio víctima>}`. Los ids de gimnasio se pueden leer públicamente.
  2. Hacer login con ese email, usando la cédula como contraseña.
- **Actual:** el atacante queda como staff del gimnasio víctima, con lectura y escritura sobre sus socios, pagos y gastos.
- **Esperado:** solo un admin o recepcionista de ese gimnasio puede crear socios.
- **Fix:** validar el JWT con `auth.getUser(token)` y verificar `user_can_access_gym(caller, gym_id)` más el rol de staff.

**[SEV-1 / P1] S3. Todo socio es "staff" de su gimnasio y ve todo el tenant**
- **Componente:**
  - `create-member-auth/index.ts:67-70` inserta cada socio en `gym_staff`.
  - `user_can_access_gym()` (migración `20260416183638`, líneas 2-12) solo revisa `gym_staff` y no el rol.
  - `App.tsx` usa `ProtectedRoute` sin `requiredRoles` en las rutas ERP.
- **Pasos:**
  1. Crear un socio desde `/socios/nuevo`.
  2. Entrar como ese socio.
  3. Abrir `/recepcion`, `/pagos` o `/socios`, o ejecutar `supabase.from('payments').select('*')`.
- **Actual:** el socio ve cédulas, teléfonos y pagos de todos los socios, y puede editar o borrar gastos.
- **Esperado:** solo ve sus propios datos y lo redirigen fuera del ERP.
- **Fix:**
  - Quitar el insert en `gym_staff` y borrar las filas de socios que ya están en `gym_staff`.
  - Exigir un rol de staff en `user_can_access_gym`.
  - Agregar `requiredRoles` a las rutas.

**[SEV-1 / P1] S4. Se puede tomar la cuenta de un socio conociendo solo su cédula**
- **Componente:**
  - `get_member_email_by_cedula`: es SECURITY DEFINER, está otorgada a `anon` y su `_gym_id` es opcional (migración `20260421174537`).
  - La contraseña inicial es la cédula (`create-member-auth:29`).
- **Pasos:**
  1. Llamar `rpc('get_member_email_by_cedula', {_cedula})`, que devuelve el email del socio de cualquier gimnasio.
  2. Ejecutar `signInWithPassword({email, password: cedula})`.
- **Actual:** acceso a la cuenta, que sumado a S3 da acceso a todo el tenant. También se filtran emails entre gimnasios.
- **Fix:** contraseña inicial aleatoria con reset obligatorio (magic link), no devolver el email a `anon` y aplicar rate limit.

**[SEV-1 / P1] F1. Check-in en `/acceso` roto para admin y recepción**
- **Componente:** `src/pages/Acceso.tsx:49`. El insert en `check_ins` no envía `gym_id`, y la policy exige `gym_id IS NOT NULL`.
- **Pasos:** como recepcionista, escanear el QR de un socio o buscarlo y hacer clic en Check-in.
- **Actual:** error "new row violates row-level security". Con super_admin la fila se guarda con `gym_id = NULL` y no aparece en `/recepcion`.
- **Esperado:** el check-in se registra en el gimnasio actual.
- **Fix:** tomar `gymId` de `useGym()` e insertarlo como `gym_id: gymId`.

**[SEV-1 / P1] F2. No se pueden guardar gastos, activos fijos ni presupuestos**
- **Componente:**
  - `src/components/contabilidad/ExpenseForm.tsx:26-31`
  - `Level1Expert.tsx:67-71` y `80-84`
- **Causa:** es la misma de F1: los inserts no envían `gym_id`.
- **Pasos:** ir a Contabilidad → Gasto, completar el formulario y guardar.
- **Actual:** error de RLS. Con super_admin la fila queda huérfana.
- **Fix:** enviar `gym_id: gymId` en los tres inserts.

**[SEV-1 / P1] F3. "Socio creado ✅" aunque fallen la membresía o el pago**
- **Componente:** `src/pages/SocioNuevo.tsx:77-114`. No se revisa `error` en el update de `members`, ni en el insert de `subscriptions`, ni en el de `payments`.
- **Pasos:**
  1. Crear un socio con plan.
  2. Forzar un fallo en el insert de `subscriptions`, por ejemplo borrando el plan desde otra pestaña.
- **Actual:** se muestra el toast de éxito, pero el socio queda sin membresía y sin pago.
- **Fix:** desestructurar `{ error }` en cada llamada y abortar si hay error. Idealmente, hacer todo en una sola RPC transaccional.

### 🟠 SEV-2 — Altos

**[SEV-2 / P1] S5. Escalada y borrado de roles entre gimnasios**
- **Componente:**
  - Cualquier usuario autenticado puede crear un gimnasio y asignarse el rol `admin` global (migración `20260422061822:3-21`).
  - Puede agregar cualquier `user_id` a su `gym_staff` (migración `20260413055255:43-47`).
  - Con eso califica para las policies de gestión de roles (migraciones `20260417001036:150-174` y `20260416221900`).
- **Pasos:**
  1. Ejecutar `gym_staff.insert({gym_id: miGym, user_id: victima})`.
  2. Ejecutar `user_roles.delete().eq('user_id', victima).eq('role', 'admin')`.
- **Actual:** el admin del gimnasio B pierde su rol.
- **Causa:** `user_roles` es global, no por gimnasio.
- **Fix:** guardar el rol por fila de `gym_staff` y eliminar la policy que permite autoasignarse admin.

**[SEV-2 / P1] S6. Archivos InBody (datos de salud) abiertos entre gimnasios**
- **Componente:** migración `20260508083641:56-66`. El bucket `inbody-files` permite SELECT, INSERT y DELETE a cualquier usuario `authenticated`.
- **Pasos:** como socio de cualquier gimnasio, ejecutar `storage.from('inbody-files').list('')` y luego `.download(path)` o `.remove([path])`.
- **Fix:** restringir por prefijo de ruta `gym_id/` y validar con `user_can_access_gym`.

**[SEV-2 / P2] S7. Un dueño puede saltarse la facturación del SaaS**
- **Componente:** la policy "Gym owners can update own gym" no restringe columnas, y `gym_features` y `gym_subscriptions` son editables por el dueño.
- **Pasos:** ejecutar `gyms.update({subscription_status: 'active', trial_ends_at: '2099-01-01'}).eq('id', miGym)`.
- **Fix:** proteger las columnas de facturación con un trigger o con GRANTs por columna, y dejar features y suscripciones solo para super_admin.

**[SEV-2 / P2] S8. El staff desactivado conserva el acceso**
- **Componente:** `gym_staff.is_active` nunca se revisa en `user_can_access_gym`.
- **Fix:** agregar `AND is_active` a la condición.

**[SEV-2 / P1] D1. Fechas en UTC en lugar de la hora de Costa Rica**
Afecta a `/recepcion`, `/acceso`, Cobranza, Cierres de caja, Contabilidad y Reportes.
- **Componente:**
  - `RecepcionDashboard.tsx:24,46,53,69,74,79,189,191,292`
  - `Acceso.tsx:25,94`
  - `Cobranza.tsx:76-99,181,390,431,459`
  - `CierresCaja.tsx:249-253,304`
  - `Reportes.tsx:86`
  - `useReports.ts:27,52`
  - `SocioNuevo.tsx:97-98`
  - El `DEFAULT CURRENT_DATE` de `payments`, `shop_sales` y `cash_registers`
- **Pasos:**
  - **A.** Abrir `/recepcion` a las 19:00 hora de CR: desaparecen los check-ins del día y se puede hacer check-in doble.
  - **B.** Ver un pago con `payment_date = 2026-11-15`: se muestra "14 nov".
  - **C.** Ver un pago del día 1 del mes: no suma en "Cobrado este mes".
  - **D.** Pedir un reporte personalizado del 01 al 31 de octubre: consulta del 30 de septiembre al 30 de octubre.
  - **E.** Crear un socio a las 19:00: su `start_date` queda con la fecha de mañana.
- **Causa:** se usan `toISOString().slice(0,10)` y `new Date('YYYY-MM-DD')` (que se interpreta como medianoche UTC), además de `CURRENT_DATE` en UTC.
- **Fix:**
  - Crear un helper único `todayLocal() = format(new Date(), 'yyyy-MM-dd')` y parsear con `parseISO`.
  - Para timestamps, usar `startOfDay(new Date()).toISOString()`.
  - En la base de datos, usar `(now() AT TIME ZONE 'America/Costa_Rica')::date`.

**[SEV-2 / P1] D2. Socios con membresía vencida, o sin membresía, pueden hacer check-in**
- **Componente:** `RecepcionDashboard.tsx:188,226` y `Acceso.tsx:81-109`. Nada en el sistema marca las suscripciones como `expired`.
- **Pasos:** elegir un socio con `end_date` en el pasado y hacerle check-in.
- **Actual:** se permite. La pantalla muestra "-5d" pero el botón sigue habilitado.
- **Fix:** validar `end_date >= hoy` en la UI y en el servidor (RPC o policy).

**[SEV-2 / P1] D3. Doble envío en Cobranza, Tienda, gastos y arqueos crea registros duplicados**
- **Componente:**
  - `Cobranza.tsx:155-171,280`
  - `Tienda.tsx:117`
  - `ExpenseForm`
  - Los arqueos de `Level2` y `Level3`
- **Pasos:** hacer doble clic en "Registrar" con la red lenta (throttling 3G en DevTools).
- **Actual:** se crean 2 pagos.
- **Fix:** agregar un estado `submitting` y poner `disabled={submitting}` en el botón.

**[SEV-2 / P1] D4. El stock de Tienda queda mal con ventas concurrentes o si falla el update**
- **Componente:** `Tienda.tsx:86-97`. El stock se lee, se modifica y se escribe desde el cliente, y no se revisa el error del update.
- **Pasos:** con un producto de stock 1, vender desde 2 cajas al mismo tiempo.
- **Actual:** se registran 2 ventas y el stock queda en 0.
- **Esperado:** la segunda venta se rechaza.
- **Fix:** una RPC transaccional que ejecute `UPDATE ... SET stock = stock - qty WHERE stock >= qty` junto con el insert de la venta.

**[SEV-2 / P2] D5. Reportes y Contabilidad se truncan en 1000 filas**
- **Componente:** `useReports.ts:27-33` y `useAccounting.ts:243-251`. No hay `.range()` y PostgREST corta en 1000 filas (`max_rows`).
- **Pasos:** con un gimnasio de unos 300 socios, pedir el reporte de 30 días, que tiene más de 1000 check-ins.
- **Actual:** la asistencia, la hora pico y los ingresos salen subcontados.
- **Fix:** agregar los totales en el servidor con una vista o RPC (SUM/COUNT), o paginar.

**[SEV-2 / P2] D6. Se suman montos de distintas monedas como si fueran colones**
- **Componente:**
  - `Cobranza.tsx:75-86,289-291`
  - `useAccounting.ts:270`
  - `useReports.ts:80`
  - `Reportes.tsx:152-155,303`
- **Pasos:** registrar un pago de USD 50 y otro de ₡25 000.
- **Actual:** se muestra "₡25 050".
- **Fix:** agrupar por `currency` o convertir con un tipo de cambio antes de sumar.

**[SEV-2 / P2] D7. `/acceso` ignora el gimnasio seleccionado**
- **Componente:** `Acceso.tsx:26-44,86-101`. Ninguna consulta filtra por `gym_id`.
- **Pasos:** como super_admin, o como staff de 2 gimnasios, cambiar de gimnasio en GymSwitcher.
- **Actual:** las visitas y la búsqueda mezclan socios de todos los gimnasios.
- **Fix:** agregar `.eq('gym_id', gymId)` a las consultas y `gymId` a las dependencias.

**[SEV-2 / P2] D8. Buscar con coma o paréntesis rompe la consulta y ofrece crear un socio duplicado**
- **Componente:** `RecepcionDashboard.tsx:105` y `Acceso.tsx:43`. El texto del usuario entra crudo en `.or()`.
- **Pasos:** buscar `Pérez, Juan`.
- **Actual:** PostgREST devuelve un error de parseo, que se ignora. La pantalla muestra "No se encontró" junto al botón "Registrar como nuevo".
- **Fix:** escapar o quitar `,()` del texto, o buscar mediante una RPC.

**[SEV-2 / P2] D9. RegisterGym roto para usuarios normales**
- **Componente:** `RegisterGym.tsx:112-146`. El cliente inserta directamente en `gyms`, `gym_features` y `gym_subscriptions`.
- **Actual:** el flujo se detiene con un error de RLS.
- **Fix:** usar la edge function `create-gym`, que ya existe.
- **SOSPECHA:** depende de policies que no están en el repositorio.

### 🟡 SEV-3 — Medios

| ID | Hallazgo | Ubicación | Fix |
|---|---|---|---|
| S9 | Policies viejas de storage nunca se eliminaron: "Anyone can view equipment photos" y "Authenticated can delete…" siguen activas, porque el `DROP` usó nombres equivocados. Cualquiera borra imágenes de otros gimnasios | migraciones `20260416184319:6-9`, `20260403001718:10,14`, `20260408082843:58,60` | Ejecutar `DROP POLICY` con los nombres reales |
| S10 | Las edge functions `parse-inbody` (SSRF: hace fetch a cualquier URL), `gym-ai-assistant` y `erp-ai-assistant` (proxy abierto que gasta `LOVABLE_API_KEY`) y `send-inbody-email` (IDOR y HTML sin escapar) no validan a quien las llama | `supabase/functions/*` | Validar con `auth.getUser` y la pertenencia al gimnasio, y usar una allowlist de URLs |
| S11 | Las funciones `has_role`, `get_owned_gym_ids` y similares se pueden invocar con cualquier `_user_id`, lo que permite enumerar privilegios | migraciones | Ejecutar `REVOKE EXECUTE … FROM anon, public` |
| D10 | `/recepcion` no tiene estados de carga ni de error, ni realtime. Muestra "Sin alertas 🎉" mientras carga o si falla, y respuestas de un gimnasio anterior pueden pisar el actual | `RecepcionDashboard.tsx:42-91,126` | Agregar `loading`/`error`, un flag para ignorar respuestas viejas y un canal realtime sobre `check_ins` |
| D11 | Pagar en Cobranza no renueva ni vincula la membresía: no guarda `subscription_id` ni extiende `end_date` | `Cobranza.tsx:158-165` | Crear o extender la suscripción y enlazar el pago |
| D12 | Un plan se puede guardar con duración 0 (si el campo queda vacío) o con precio negativo | `PlanEditor.tsx:76-85`, `PlanWizard.tsx:176` | Validar `duration_days >= 1` y `price > 0` |
| D13 | El import CSV no respeta comillas, no acepta `;` (el separador de Excel en español) ni archivos en Windows-1252 ("Jim�nez") | `SociosImportar.tsx:16-26`, `UsuariosImportar.tsx:19-24` | Usar PapaParse (ya es dependencia) con detección de separador y codificación |
| D14 | La lista de "pagos pendientes" omite los pagos con estado `overdue` | `RecepcionDashboard.tsx:58` | Usar `.in('status', ['pending', 'overdue'])` |
| D15 | `/recepcion` no aparece en el menú | `AppSidebar.tsx:19-45` | Agregarlo a `receptionistItems` y `adminItems` |
| D16 | Inventario: el borrado no pide confirmación y no se revisan errores ("Video guardado ✅" aunque falle) | `Inventario.tsx:110-127` | Agregar confirmación y revisar `error` |
| D17 | Tienda: las tarjetas "Ventas (mes)" e "Ingresos" en realidad cuentan las últimas 100 ventas de cualquier fecha | `Tienda.tsx:47,129-130` | Filtrar por mes en la consulta |

### ⚪ SEV-4 — Bajos

- `currency.ts:13`: el formato depende del locale del navegador y los negativos salen como "₡-500". Usar `Intl.NumberFormat('es-CR', {style: 'currency', currency})`.
- `Reportes.tsx:27-34`: `RANGE_PRESETS` se calcula al cargar el módulo, así que queda congelado si la pestaña sigue abierta pasada la medianoche.
- `RecepcionDashboard.tsx:239`: "No se encontró" aparece por un instante mientras la búsqueda carga.
- `ProtectedRoute.tsx:59`: lanza un toast durante el render. Moverlo a un `useEffect`.
- `AppLayout.tsx:72`: el socio ve por un instante la navegación de staff mientras cargan los roles.
- `ResetPassword.tsx:24-26`: con una sesión abierta se puede cambiar la contraseña sin pasar por el evento `PASSWORD_RECOVERY`.
- **SOSPECHA:** `payments.member_id ON DELETE CASCADE` hace que borrar un socio elimine su historial de pagos.
- **SOSPECHA:** `delete-gym:80-83` borra el usuario auth del dueño aunque sea dueño o staff de otros gimnasios.

---

## 2. Plan de pruebas

**Alcance:**
- Autorización multi-tenant (RLS y edge functions)
- Check-in (`/acceso`, `/recepcion`)
- Socios y membresías
- Cobranza, Tienda, Cierres de caja y Contabilidad
- Reportes
- Importación CSV

**Fuera de alcance:** asistentes de IA (salvo su autenticación), estética visual y rendimiento de carga.

**Estrategia (pirámide):**
1. **Unit (Vitest):** extraer y probar la lógica pura: fechas locales, días para vencer, totales por moneda, parser CSV y validación de planes.
2. **Integración RLS (Vitest + Supabase local con `supabase start`):** crear 2 gimnasios y 4 usuarios (admin A, recepción A, socio A, admin B) y verificar quién puede leer y escribir qué. Es la suite de mayor valor.
3. **E2E (Playwright, ya configurado):** solo flujos críticos: login de staff → crear socio con plan → check-in → registrar pago → cierre de caja.

**Datos de prueba:**
- Gimnasios A y B.
- Socios con suscripción vigente, con suscripción que vence hoy, vencida y sin suscripción.
- Pagos en CRC y USD con fechas el día 1 y el último día del mes.
- Producto con stock 1.
- CSV con `;`, comillas, acentos en Windows-1252 y filas duplicadas.

### Casos clave

| ID | Tipo | Prioridad | Caso | Esperado | Automatizable |
|---|---|---|---|---|---|
| TC-01 | seguridad | P1 | Llamar `admin-setpw` con la anon key | 401/403 o 404 (función eliminada) | integración |
| TC-02 | seguridad | P1 | Llamar `create-member-auth` con la anon key y el `gym_id` de B | 401/403, sin usuario creado | integración |
| TC-03 | seguridad | P1 | Socio A ejecuta `select` sobre `payments`, `members` y `expenses` | Solo filas propias en `payments`/`members`; 0 filas en `expenses` | integración RLS |
| TC-04 | seguridad | P1 | Admin A ejecuta `select` y `update` sobre `members` de B | 0 filas / error | integración RLS |
| TC-05 | seguridad | P1 | Socio A abre `/recepcion`, `/pagos` y `/usuarios` por URL | Redirige a `/mi-gym` | E2E |
| TC-06 | seguridad | P1 | `anon` llama `get_member_email_by_cedula` | No devuelve el email | integración |
| TC-07 | seguridad | P1 | Socio A lista `inbody-files` de B | Lista vacía o error | integración |
| TC-08 | seguridad | P2 | Admin A agrega a admin B a su `gym_staff` y le borra el rol | Rechazado | integración RLS |
| TC-09 | seguridad | P2 | Staff con `is_active = false` lee `members` | 0 filas | integración RLS |
| TC-10 | funcional | P1 | Recepción hace check-in por QR en `/acceso` | Fila guardada con el `gym_id` correcto y visible en `/recepcion` | E2E |
| TC-11 | negativo | P1 | Check-in de un socio vencido o sin membresía | Rechazado con un mensaje claro | unit + E2E |
| TC-12 | borde | P1 | Check-in a las 19:00 CR (reloj simulado) y recargar `/recepcion` | Aparece en "hoy"; no permite check-in doble | unit (`vi.setSystemTime`) |
| TC-13 | borde | P1 | Mostrar `end_date = 2026-11-15` en Cobranza y en el CSV | "15 nov" / `2026-11-15` | unit |
| TC-14 | borde | P1 | Pago del día 1 en el KPI mensual | Se cuenta en ese mes | unit |
| TC-15 | funcional | P1 | Registrar un gasto, un activo y un presupuesto como admin | Guardado con `gym_id` | E2E |
| TC-16 | negativo | P1 | Crear un socio cuando falla el insert de la suscripción | Toast de error, sin "éxito" | integración (mock) |
| TC-17 | estado | P1 | Doble clic en "Registrar pago" con la red lenta | Un solo pago creado | E2E |
| TC-18 | concurrencia | P1 | 2 ventas simultáneas de un producto con stock 1 | 1 venta aceptada y 1 rechazada; stock 0 | integración (RPC) |
| TC-19 | borde | P2 | Reporte de 30 días con 1500 check-ins | Total = 1500 | integración |
| TC-20 | funcional | P2 | Pagos de USD 50 y ₡25 000 | Totales separados por moneda | unit |
| TC-21 | negativo | P2 | Buscar `Pérez, Juan` y `a(b)` | Sin error de parseo; encuentra el socio | unit + E2E |
| TC-22 | funcional | P2 | Cambiar de gimnasio en `/acceso` | Visitas y búsqueda solo del gimnasio actual | E2E |
| TC-23 | borde | P2 | Reporte personalizado del 01 al 31 de octubre | La consulta usa 2026-10-01..2026-10-31 | unit |
| TC-24 | negativo | P2 | Plan con duración vacía o precio −5000 | Rechazado por validación | unit |
| TC-25 | borde | P2 | Importar un CSV con `;`, comillas y Windows-1252 | Todas las filas se importan bien, con acentos correctos | unit |
| TC-26 | funcional | P2 | Registrar un nuevo gimnasio como usuario normal | Gimnasio creado (vía `create-gym`) | E2E |
| TC-27 | funcional | P3 | `/recepcion` con la red caída | Muestra un estado de error, no "Sin alertas 🎉" | integración (MSW) |

---

## 3. Checklist pre-release (go / no-go)

**Bloqueantes:**
- [ ] `admin-setpw` eliminada del proyecto Supabase (no solo del repositorio)
- [ ] `create-member-auth`, `parse-inbody`, `*-ai-assistant` y `send-inbody-email` validan al usuario y su gimnasio
- [ ] Socios fuera de `gym_staff` (código y backfill), y `user_can_access_gym` revisa el rol y `is_active`
- [ ] `get_member_email_by_cedula` no devuelve el email a `anon`; la contraseña inicial ya no es la cédula
- [ ] Contraseñas reseteadas para las cuentas que tenían la cédula como contraseña
- [ ] Policies de los buckets `inbody-files`, `equipment-photos` y `promotion-images` restringidas por gimnasio
- [ ] Rutas ERP con `requiredRoles`
- [ ] Check-in en `/acceso` y gastos/activos/presupuestos guardan `gym_id` (TC-10, TC-15)
- [ ] SocioNuevo revisa los errores (TC-16)
- [ ] Suite RLS (TC-01 a TC-09) en verde en CI
- [ ] Revisión de logs de Supabase (auth y edge functions) en busca de abuso previo de `admin-setpw` y `create-member-auth`

**Recomendados antes del release:**
- [ ] Helper de fecha local aplicado en todo el código (TC-12 a TC-14, TC-23)
- [ ] Bloqueo de check-in para socios vencidos (TC-11)
- [ ] Botones deshabilitados mientras se envía (TC-17); RPC atómica de stock (TC-18)
- [ ] Totales por moneda (TC-20); agregación en el servidor para reportes (TC-19)

**Post-deploy (smoke en producción):**
- [ ] Login de admin, recepción y socio; el socio no entra a `/recepcion`
- [ ] Check-in por QR visible en `/recepcion`
- [ ] Registrar un pago y un gasto, y verlos en Contabilidad del mes actual
- [ ] Llamar `admin-setpw` y `create-member-auth` sin sesión devuelve 401/403

**Rollback:** las migraciones de RLS deben tener una migración inversa preparada. Las edge functions se revierten redesplegando la versión anterior; esto **no aplica a `admin-setpw`, que no debe volver**.
