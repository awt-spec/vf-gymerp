# Refactor MiGym → 5 sub-rutas

## Contexto

`src/pages/MiGym.tsx` tiene ~1470 líneas y todo el estado del socio (membresía, ejercicios, nutrición, clases, pagos) compartido en un solo componente con `<Tabs>`. El sidebar ya navega a `/mi-gym/ejercicios`, `/mi-gym/nutricion`, `/mi-gym/clases`, `/mi-gym/plan`, pero esas rutas no existen aún.

## Riesgo

Una "extracción literal" tab por tab implica duplicar mucha lógica compartida (member, gym, hooks de fechas, RestTimer, helpers de macros, `getYoutubeEmbedUrl`, `previewVideoUrl`, etc.). Para mantener calidad y evitar romper funcionalidad ya entregada (preview de plan, popup de YouTube, contador prominente de membresía, clases agendadas hoy, etc.), conviene hacerlo en pasos verificables.

## Plan en 2 fases

### Fase 1 — Andamiaje + extracción mecánica (esta tarea)

1. **Crear `src/hooks/useMemberData.tsx`**: hook compartido que devuelve `{ member, gymId, subscription, subDaysLeft, loading }` consultando `members` + `subscriptions(plans(...))` por `auth_user_id`. Lo usarán las 5 páginas.

2. **Mover helpers fuera del componente** a `src/lib/migym-helpers.ts`:
   - `getYoutubeEmbedUrl`, `guessMuscleGroup`, `WORKOUT_CATEGORIES`, `SPLIT_LABELS`, tipos `PlanExercise`.

3. **Crear los 4 archivos de página** copiando el bloque correspondiente del JSX actual + sus estados/efectos. Cada página es self-contained:
   - `src/pages/MiGymEjercicios.tsx` — planes, sesión guiada, RestTimer, preview de plan, popup YouTube, heatmap, historial workouts.
   - `src/pages/MiGymNutricion.tsx` — DateStrip, rings macros, buscador, scanner de barras, comidas del día.
   - `src/pages/MiGymClases.tsx` — reservas + horario semanal con reserve/cancel.
   - `src/pages/MiGymPlan.tsx` — card de suscripción con progreso, QR del socio, historial de pagos.

4. **Simplificar `src/pages/MiGym.tsx`** a solo el "Inicio":
   - Saludo + header
   - Contador prominente de membresía (ya implementado)
   - Card de clases agendadas hoy (ya implementado)
   - Sugerencia "Hoy te toca" (rutina del día) — link a `/mi-gym/ejercicios`
   - Resumen del día: workouts realizados + comidas registradas
   - Grid de stats: días entrenados, logros

5. **Registrar rutas en `src/App.tsx`** dentro del `AppLayout`:
   ```tsx
   <Route path="/mi-gym" element={<MiGym />} />
   <Route path="/mi-gym/ejercicios" element={<MiGymEjercicios />} />
   <Route path="/mi-gym/nutricion" element={<MiGymNutricion />} />
   <Route path="/mi-gym/clases" element={<MiGymClases />} />
   <Route path="/mi-gym/plan" element={<MiGymPlan />} />
   ```

### Fase 2 — Limpieza (solicitar aparte si todo funciona)

- Borrar el `<Tabs>` y todo el código muerto restante en `MiGym.tsx`.
- Eliminar imports y states no usados.
- Verificar que `useGymFeatures.alwaysEnabled` cubre las 4 nuevas rutas (ya hecho).

## Archivos tocados en Fase 1

- ✏️ `src/App.tsx` — agregar 4 rutas + imports
- 🆕 `src/hooks/useMemberData.tsx`
- 🆕 `src/lib/migym-helpers.ts`
- 🆕 `src/pages/MiGymEjercicios.tsx`
- 🆕 `src/pages/MiGymNutricion.tsx`
- 🆕 `src/pages/MiGymClases.tsx`
- 🆕 `src/pages/MiGymPlan.tsx`
- ✏️ `src/pages/MiGym.tsx` — reducido a ~200 líneas (Inicio)

## Notas técnicas

- Cada página hace su propio `useEffect` de fetch. Aceptamos algo de duplicación de queries entre páginas — la alternativa (Context global) sería sobre-ingeniería para 5 vistas.
- La sesión guiada de ejercicios (state `sessionPlan`, `inSession`, RestTimer) vivirá íntegramente en `MiGymEjercicios.tsx`. Si el usuario navega fuera de esa ruta durante una sesión, la sesión se pierde — esto es aceptable porque el sidebar es navegación intencional.
- `previewVideoUrl` y `previewPlan` son locales a `MiGymEjercicios.tsx`.

## Confirmación

¿Apruebas este plan? Es un cambio grande (~7 archivos nuevos/modificados, ~1500 líneas movidas). Si hay algo que prefieres ajustar (ej. mantener la sesión de entrenamiento en estado global, no extraer todo de golpe, etc.), dímelo antes de ejecutar.
