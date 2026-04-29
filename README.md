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

1. Copia `.env.example` a `.env` en la raíz del proyecto.
2. Agrega tu clave de OpenAI en `OPENAI_API_KEY`.
3. Ejecuta:

```bash
docker-compose up --build
```

- El backend quedará disponible en `http://localhost:4000`
- El frontend quedará disponible en `http://localhost:8080`

El servicio de frontend ya está configurado para apuntar al backend por su nombre de servicio `http://backend:4000` dentro de Docker.

