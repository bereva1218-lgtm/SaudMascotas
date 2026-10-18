# MyPet: Monitoreo y alerta temprana para perros senior

Plataforma web para dar seguimiento diario a la salud de perros senior o con condiciones crónicas.
A partir de un registro diario sencillo, la app compara cada día con el historial propio de la
mascota, detecta descensos (apetito, energía, ánimo, agua, sueño, movilidad), genera **alertas con
explicación y recomendación**, y recuerda al dueño sus tareas: hacer el registro, dar los
medicamentos y aplicar los refuerzos de vacunas.

> La app está pensada para Colombia: todas las fechas y horas se calculan en la zona horaria
> `America/Bogota`.

## Objetivos

- Detectar de forma temprana cambios en el comportamiento de la mascota.
- Facilitar el seguimiento diario de su salud.
- Reducir diagnósticos tardíos mediante alertas preventivas.
- Centralizar vacunas, medicamentos y gastos de cada mascota.

## Funcionalidades

### Cuentas y mascotas
- Registro e inicio de sesión de usuarios (JWT).
- Perfil de cada mascota: foto, raza, edad, peso y condición diagnosticada.
- **Nombre único por dueño**: "Luna", "luna " y "LUNA" cuentan como el mismo nombre. Se valida en el
  formulario, en el servidor y con una restricción en la base de datos.
- Recomendación de cuidado generada con IA para cada mascota.

### Registro diario
- Seis indicadores en escala de 1 a 5: apetito, energía, ánimo, consumo de agua, sueño y movilidad,
  más observaciones.
- **Un solo registro por mascota y por día** (día de Colombia). Si ya existe, se abre en modo edición
  con los datos precargados: *"Ya registraste hoy a Luna; puedes editarlo"*.

### Alertas inteligentes
Se generan automáticamente al guardar o editar un registro, comparando cada indicador con el
**promedio habitual de esa mascota** (no con valores genéricos).

| Nivel | Cuándo se genera |
|---|---|
| **Precaución** | 1 o 2 días seguidos al menos 1 punto por debajo de su promedio habitual |
| **Alerta** | 3 o más días seguidos por debajo, o el promedio de los últimos 3 registros cae un 30 % o más |
| **Resuelta** | el indicador vuelve a su nivel habitual (la alerta se cierra sola) |

- El promedio habitual se calcula con los últimos 14 registros (mínimo 3). Mientras no hay historial
  suficiente, se marca como bajo un valor de 2 o menos.
- Cada alerta trae **el porqué**, basado en los datos reales. Ejemplo: *"Tu mascota Max ha presentado
  varios días con poca actividad física (3 días seguidos con actividad física baja; promedio 3/5), por
  debajo de su promedio habitual (4,4/5)."*
- Y una **recomendación** según el indicador afectado, la condición de la mascota, los medicamentos
  que está tomando y las vacunas recientes. Siempre se aclara que es una sugerencia informativa y no
  un diagnóstico veterinario.
- No hay alertas duplicadas: si ya existe una activa para la misma mascota e indicador, se actualiza.
- El estado de la mascota (Estable, Observación o Alerta) se deriva de sus alertas activas.
- Los umbrales se pueden ajustar en `ALERT_CONFIG` (`backend/src/alertRules.ts`).

### Recordatorios
Aparecen en el inicio, en la pestaña **Recordatorios** de Alertas y como contador en el menú:
- **Registro diario pendiente**, con prioridad alta desde las 6 p. m. o si lleva días sin registrar.
- **Dosis de medicamentos**: dosis atrasadas y próxima dosis. Se pueden marcar como administradas
  desde el mismo recordatorio y dejan de aparecer cuando termina el tratamiento.
- **Refuerzos de vacunas**: desde 14 días antes y mientras estén vencidos.

Por ahora los recordatorios se muestran dentro de la app. Están construidos de forma independiente
del canal para poder enviarlos más adelante por correo o SMS.

### Vacunas y medicamentos
- **Vacunas**: historial por mascota con fecha de aplicación, próximo refuerzo, veterinario o clínica
  y notas. Cada vacuna indica si el refuerzo está vencido, próximo o al día.
- **Medicamentos**: dosis, frecuencia (cada X horas), fecha y hora de la primera dosis y fin del
  tratamiento (por fecha o duración en días). Muestra el estado (programado, activo o finalizado), la
  próxima dosis y las dosis pendientes; se puede marcar una dosis como administrada o deshacerla.

### Compras
- Registro de artículos comprados para cada mascota: juguetes, collar, vestimenta, comida,
  accesorios, higiene u otro.
- Fecha, precio en pesos colombianos (opcional), notas y hasta 3 fotos del artículo o del recibo.
- Filtros por mascota y categoría, y **total gastado**.

### Reportes, inicio y asistente con IA
- **Inicio**: saludo según la hora de Colombia, resumen de estados, recordatorios y alertas sin leer.
  Se abre desde el logo.
- **Reportes**: gráfica de la evolución de los indicadores y registros recientes.
- **Chat veterinario con IA**: botón flotante en todas las pantallas; responde con base en los datos
  y el último registro de tus mascotas (OpenAI, modelo `gpt-4o-mini`).

### Seguridad
Cada usuario solo puede ver y modificar sus propias mascotas, registros, alertas, compras, vacunas y
medicamentos. Al eliminar una mascota se eliminan también todos sus datos asociados.

## En desarrollo

Estas partes existen en la interfaz pero aún no están completas:

- **Exportar reporte en PDF**: el botón muestra un aviso; todavía no genera el archivo.
- **Fotos en el registro diario**: la carga de imágenes está simulada. Las fotos de mascotas y de
  compras sí funcionan.
- **Roles**: existen Cuidador, Administrador y Gerente, pero por ahora solo cambian el texto del
  inicio; no hay permisos distintos por rol. El rol de Veterinario está planeado.
- **Recordatorios por correo o celular**: planeados; hoy se muestran solo dentro de la app.
- **Botón "LIA" del encabezado**: aún no tiene acción; el chat se abre con el botón flotante.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts |
| Backend | Node.js 20, Express, TypeScript |
| Base de datos | SQLite con Prisma ORM y migraciones |
| IA | OpenAI (`gpt-4o-mini`) |
| Pruebas | Vitest y Testing Library |
| Infraestructura | Docker y Docker Compose |

## Estructura del proyecto

```
backend/
  prisma/schema.prisma        Modelos: usuarios, mascotas, registros, alertas, compras, vacunas, medicamentos
  prisma/migrations/          Migraciones de la base de datos
  src/index.ts                Rutas de la API
  src/alertRules.ts           Reglas, umbrales y textos de las alertas
  src/alerts.ts               Crea, actualiza y resuelve alertas
  src/reminders.ts            Recordatorios
  src/health.ts               Vacunas, medicamentos y calendario de dosis
  src/dailyLogs.ts            Registro diario (uno por día)
  src/purchases.ts            Compras
  src/dates.ts                Fechas y horas de Colombia
  src/openai.ts               Chat y recomendaciones con IA
  test/                       Pruebas del backend
Frontend/idea-to-interface-main/
  src/pages/                  Inicio, Registro, Alertas, Reportes, Mascotas, Compras, Vacunas y medicamentos
  src/components/             Componentes (tarjetas de alerta, recordatorios, chat, menú...)
  src/lib/                    Cliente de la API, tipos y utilidades
  src/test/                   Pruebas del frontend
docker-compose.yml
```

## Ejecución con Docker Compose

1. Copia `backend/.env.example` como `backend/.env` (si aún no existe).
2. Agrega tu clave de OpenAI en `OPENAI_API_KEY` dentro de `backend/.env`.
3. Ejecuta:

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

Al iniciar, el backend aplica las migraciones pendientes de la base de datos (`prisma migrate deploy`).
El navegador llama al backend en `http://127.0.0.1:4000` (variable `VITE_API_URL` en `docker-compose.yml`).

> En Windows, Docker no detecta automáticamente los cambios en el código: después de modificar archivos,
> reinicia los contenedores con `docker compose up -d --force-recreate backend frontend`.

## Ejecución sin Docker

```bash
# Backend (http://localhost:4000)
cd backend
npm install
npx prisma migrate deploy
npm run dev

# Frontend (http://localhost:9100), en otra terminal
cd Frontend/idea-to-interface-main
npm install
npm run dev
```

## Configurar o cambiar la clave de OpenAI

La clave se usa para el chat y las recomendaciones con IA. Vive **solo** en `backend/.env`,
que git ignora para no publicarla; `backend/.env.example` es la plantilla sin datos reales.

1. Crea una clave nueva en <https://platform.openai.com/api-keys> (y revoca la anterior si se expuso).
2. Abre `backend/.env` y reemplaza el valor:

   ```env
   OPENAI_API_KEY=sk-proj-tu-clave-nueva
   ```

3. Verifica la configuración (no muestra la clave):

   ```bash
   cd backend
   node check-config.js
   ```

4. Recrea el contenedor del backend para que lea el nuevo valor (`restart` no basta, porque
   el archivo `.env` se lee al crear el contenedor):

   ```bash
   docker compose up -d --force-recreate backend
   ```

Si la clave no es válida, el resto de la app sigue funcionando; solo fallan el chat y las
recomendaciones con IA.

## Pruebas

```bash
cd backend && npm test                              # reglas de alertas, registro diario, recordatorios, vacunas y medicamentos, compras
cd Frontend/idea-to-interface-main && npm test      # páginas y componentes
```

Las pruebas de base de datos del backend usan una base SQLite temporal con las migraciones reales;
no modifican `dev.db`.

## API principal

Todas las rutas (salvo autenticación) requieren el encabezado `Authorization: Bearer <token>`.

| Recurso | Rutas |
|---|---|
| Autenticación | `POST /auth/register`, `POST /auth/login` |
| Mascotas | `GET/POST /pets`, `GET/PATCH/DELETE /pets/:id`, `PATCH /pets/:id/recommendation` |
| Registro diario | `GET /logs`, `GET /logs/today?petId=`, `POST /logs`, `PUT /logs/:id` |
| Alertas | `GET /alerts`, `GET /alerts/:id`, `PUT /alerts/:id/read` |
| Recordatorios | `GET /reminders` |
| Compras | `GET/POST /purchases` (filtros `petId`, `category`), `PUT/DELETE /purchases/:id` |
| Vacunas | `GET/POST /vaccines`, `PUT/DELETE /vaccines/:id` |
| Medicamentos | `GET/POST /medications`, `PUT/DELETE /medications/:id`, `POST/DELETE /medications/:id/doses` |
| Asistente IA | `POST /chat` |
