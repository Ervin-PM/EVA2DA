# TODO List · React Native + Expo

Aplicación móvil con autenticación JWT, CRUD de tareas, gestión de imágenes y ubicación geográfica.

## Información del Proyecto

**Autor:** Ervin Pinto Madariaga  
**Tipo:** Proyecto individual (Examen Transversal - Desarrollo de Aplicaciones Móviles)  
**Repositorio:** https://github.com/Ervin-PM/EVA2DA.git  
**Fecha:** Diciembre 2025

### Uso de Inteligencia Artificial

Este proyecto fue desarrollado con el apoyo de **GitHub Copilot** como asistente de IA, utilizado para:

- **Documentación:** Generación de comentarios y documentación técnica
- **Optimización:** Implementación de manejo de imágenes con compresión y reintentos en peticiones de red

**Nota importante:** Toda la arquitectura, decisiones de diseño y lógica de negocio fueron definidas por el desarrollador. La IA se utilizó como herramienta de productividad para acelerar la implementación de patrones establecidos y solución de problemas técnicos específicos.

## Características

- ✅ Autenticación JWT con backend REST
- ✅ CRUD completo de tareas
- ✅ Carga de imágenes (multipart/form-data)
- ✅ Ubicación geográfica en tareas
- ✅ Captura/selección de fotos
- ✅ Navegación protegida por sesión

## API del Backend

**URL:** `https://todo-list.dobleb.cl`

```
POST   /auth/register  - Registro
POST   /auth/login     - Login (retorna JWT)
GET    /todos          - Listar tareas
POST   /todos          - Crear tarea
PATCH  /todos/{id}     - Actualizar
DELETE /todos/{id}     - Eliminar
POST   /images         - Subir imagen
```

## Arquitectura

```
app/
  login.tsx           - Login/Registro con autenticación JWT
  (tabs)/
    index.tsx         - Pantalla principal/Home
    todos.tsx         - Lista de tareas con CRUD completo
utils/
  api.ts              - Cliente API con axios y manejo de tokens
  tasks.ts            - Funciones de negocio para tareas
hooks/
  useTodos.ts         - Custom hook con lógica CRUD encapsulada
  use-color-scheme.ts - Hook para manejo de tema
  use-theme-color.ts  - Hook para colores del tema
components/
  themed-view.tsx     - Componente con gradiente global
```

### Encapsulación con Custom Hooks

El proyecto implementa el patrón de **Custom Hooks** para separar la lógica de negocio de la presentación:

**`hooks/useTodos.ts`** - Encapsula toda la lógica del CRUD de tareas:
- ✅ Gestión de estado (tareas, loading, errores)
- ✅ Obtener tareas del backend
- ✅ Crear tareas con imágenes y ubicación
- ✅ Eliminar tareas
- ✅ Cambiar estado de completado
- ✅ Manejo de autenticación y navegación

Este patrón permite:
- **Reutilización:** El hook puede usarse en múltiples componentes
- **Testabilidad:** La lógica se puede probar de forma aislada
- **Mantenibilidad:** Separación clara entre UI y lógica de negocio
- **Legibilidad:** Componentes más limpios enfocados en la presentación

## Instalación y Ejecución

```powershell
npm install
npx expo start
```

## Configuración de Entorno

Crear `.env.local`:
```env
EXPO_PUBLIC_API_URL=https://todo-list.dobleb.cl
```

## Flujo de Autenticación 

1. Login → Backend retorna JWT
2. Token guardado en AsyncStorage
3. Headers automáticos: `Authorization: Bearer <token>`
4. Rutas protegidas redirigen sin sesión

## Uso Rápido

**Crear cuenta:**
1. "Registrarse" → Ingresar email/password
2. Backend crea usuario y retorna token

**Crear tarea:**
1. "Nueva tarea" → Título
2. "Tomar/Elegir foto" → Sube a R2
3. "Ubicación" → Captura coordenadas
4. "Crear" → POST /todos

## Requisitos Funcionales 

**Autenticación (login/registro):**
- ✅ Pantalla en `app/login.tsx` con envío de credenciales al backend (`POST /auth/login`/`/auth/register`)
- ✅ Token JWT persistido en AsyncStorage y usado en todos los requests vía `utils/api.ts`
- ✅ Protección de rutas mediante verificación de sesión y redirección a login si no hay token
- ✅ Manejo de errores de la API (401, 403, 500)

**Lista de tareas (CRUD 100% Backend):**
- ✅ Vista principal en `app/(tabs)/todos.tsx` usa el custom hook `useTodos`
- ✅ **Listado:** `GET /todos` del usuario autenticado (sin persistencia local)
- ✅ **Crear:** Título, imagen (subida a través de `POST /images`) y ubicación; luego `POST /todos` con la URL devuelta
- ✅ **Actualizar:** `PATCH /todos/{id}` actualiza estado de completado en backend
- ✅ **Eliminar:** `DELETE /todos/{id}` borra la tarea en backend
- ✅ **Restricción:** Tareas asociadas al usuario autenticado, API limita lista a ese usuario
- ✅ **Sin persistencia local:** Toda la data proviene del backend, no se usa AsyncStorage para tareas ni imágenes

**Manejo de imágenes (obligatorio):**
- ✅ Captura/selección con `expo-image-picker` (API nativa del dispositivo)
- ✅ Optimización automática (compresión y redimensionamiento a <5MB)
- ✅ Envío al servidor con multipart/form-data (`POST /images`)
- ✅ Backend retorna URL; la app muestra esa URL en la lista
- ✅ Manejo de permisos de cámara y galería

**Custom Hooks (obligatorio):**
- ✅ Lógica CRUD encapsulada en `hooks/useTodos.ts`
- ✅ Componentes enfocados en presentación, sin lógica de negocio
- ✅ Manejo centralizado de `loading`, `error` y estados

**Variables de entorno:**
- ✅ Configurar la URL base del backend en `.env.local`:
  ```env
  EXPO_PUBLIC_API_URL=https://todo-list.dobleb.cl
  ```
  
  ```env
  EXPO_PUBLIC_API_URL=https://todo-list.dobleb.cl
  ```

## Implementación

- **Autenticación (login/registro):**
  - Pantalla en `app/login.tsx` con envío de credenciales al backend (`POST /auth/login`/`/auth/register`)
  - Token JWT persistido en AsyncStorage y usado en todos los requests vía `utils/api.ts`
  - Protección de rutas mediante verificación de sesión en el custom hook y redirección a login si no hay token

- **Lista de tareas (CRUD):**
  - Vista principal en `app/(tabs)/todos.tsx` consume el custom hook `useTodos`
  - **Custom Hook `useTodos`:** Encapsula toda la lógica de negocio
    - Estado: `tasks`, `loading`, `error`, `user`
    - Métodos: `refresh()`, `createTask()`, `deleteTask()`, `toggleTaskComplete()`
    - Manejo automático de autenticación y errores
  - Listado: `GET /todos` del usuario autenticado (100% desde backend)
  - Crear: Título, imagen (subida a través de `POST /images`) y ubicación; luego `POST /todos` con la URL devuelta
  - Completar/no completar: `PATCH /todos/{id}` actualiza estado en backend
  - Eliminar: `DELETE /todos/{id}` borra la tarea en backend
  - **Sin persistencia local:** Toda la data de tareas e imágenes proviene exclusivamente del backend

- **Imágenes y ubicación:**
  - Captura/selección con `expo-image-picker` (API nativa)
  - Optimización automática con `expo-image-manipulator` (compresión y redimensionamiento)
  - Subida como multipart/form-data con manejo de errores (413, timeout, etc.)
  - Ubicación obtenida con `expo-location` y adjunta al crear la tarea

- **Proxy y cuenta demo:**
  - Proxy HTTP→HTTPS para evitar CORS/mixed content en Android durante pruebas
  - Cuenta de pruebas: Usuario `admin`, Contraseña `admin123` para validar flujos rápidamente

## Tecnologías

- React Native + Expo 54
- TypeScript
- Expo Router (navegación)
- AsyncStorage (persistencia)
- expo-image-picker, expo-location
- Linear Gradient (UI)

## Plataformas Soportadas

- iOS 13+
- Android 8+
- Web (limitado)

## Problema y Solución (Resumen)

- **Problemática detectada:** En dispositivos Android con Expo Go se presentaron restricciones de contenido mixto (HTTP→HTTPS) y políticas CORS que impedían consumir ciertos recursos y subir imágenes de forma confiable.
- **Proxy implementado:** Se añadió un pequeño proxy HTTP→HTTPS para enrutar solicitudes y evitar bloqueos por CORS/mixed content durante desarrollo y pruebas en Android. Esto estabilizó las cargas multipart/form-data y el uso de endpoints seguros.
- **Cuenta de pruebas:** Para facilitar la evaluación y evitar fricción en registro/login cuando hay latencia o límites del backend, se habilitó una cuenta de demostración. Solo para pruebas básicas.
- **Credenciales demo:** Usuario: `admin` · Contraseña: `admin123`
