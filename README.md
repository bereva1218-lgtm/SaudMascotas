Plataforma de Monitoreo y Alerta Temprana para Perros Senior

Descripción del proyecto: 

Esta plataforma es una solución digital orientada al monitoreo continuo del estado de salud de perros senior o con condiciones crónicas. Su propósito es detectar de manera temprana cambios sutiles en el comportamiento que puedan indicar problemas de salud, facilitando la toma de decisiones oportunas por parte de cuidadores y veterinarios. 
A través del registro diario, análisis automatizado e integración de datos visuales, el sistema clasifica el estado de la mascota y genera alertas inteligentes.

Objetivos: 

Detectar anomalías en el comportamiento de mascotas de forma temprana

Facilitar el seguimiento diario de la salud

Apoyar la comunicación entre cuidadores y veterinarios

Reducir diagnósticos tardíos mediante alertas preventivas

Funciaonalidades principales: 

Registro de usuario y mascotas

Registro diario de estado (energía, apetito, ánimo, etc.)

Carga de imágenes (ojos, piel, encías, etc.)

Análisis automático de datos conductuales y visuales

Clasificación del estado de salud (estable, observación, alerta)

Sistema de alertas (informativas, preventivas, urgentes)

Visualización de historial y tendencias

Generación de reportes clínicos

Interacción con veterinarios

Roles: Cuidador, Veterinario, Administrador

Cuidador:

Registra la información diaria de la mascota

Describe comportamientos observados

Carga imágenes

Recibe alertas

Genera reportes

Veterinario:

Consulta historial de mascotas

Analiza alertas

Emite recomendaciones

Hace seguimiento a casos críticos

Administrador:

Gestiona usuarios y roles

Configura reglas de alertas

Administra modelos y datasets

Supervisa seguridad del sistema

Stack: 

**Frontend**

React + TypeScript → Desarrollo de interfaces tipadas

Vite → Bundler y entorno de desarrollo rápido

Tailwind CSS → Estilizado responsivo

PostCSS → Procesamiento de estilos

Vitest → Testing del frontend

**Backend**

Node.js → Entorno de ejecución

TypeScript → Tipado estático

Express → API REST (implícito por estructura de src/index.ts)

**Base de Datos**

SQLite (dev.db) → Base de datos en desarrollo

Prisma ORM → Modelado y acceso a datos

**Herramientas y configuracion**
ESLint → Linter de código

TypeScript Config (tsconfig) → Configuración del proyecto

npm → Gestión de paquetes

Git → Control de versiones

## Ejecución con Docker Compose

Este proyecto ya cuenta con `docker-compose.yml` para levantar el backend y el frontend en contenedores.

1. Copia `backend/.env.example` como `backend/.env` (si aún no existe).
2. Agrega tu clave de OpenAI en `OPENAI_API_KEY` dentro de `backend/.env`.
3. Ejecuta:

```bash
docker compose up --build
```

- El backend quedará disponible en `http://localhost:4000`
- El frontend quedará disponible en `http://localhost:8080`

Al iniciar, el backend aplica las migraciones pendientes de la base de datos (`prisma migrate deploy`).
El navegador llama al backend en `http://127.0.0.1:4000` (variable `VITE_API_URL` en `docker-compose.yml`).

> En Windows, Docker no detecta automáticamente los cambios en el código: después de modificar archivos,
> reinicia los contenedores con `docker compose up -d --force-recreate backend frontend`.

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

