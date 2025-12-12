# TODO List · React Native + Expo

Aplicación móvil con autenticación JWT, CRUD de tareas, gestión de imágenes y ubicación geográfica.

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
  login.tsx           - Login/Registro
  (tabs)/
    index.tsx         - Home
    todos.tsx         - Lista CRUD
utils/
  api.ts              - Cliente API
  tasks.ts            - Lógica de negocio
components/
  themed-view.tsx     - Gradiente global
```

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

**Login :**
- Envía credenciales al backend.
- Guarda el token en AsyncStorage para mantener sesión.
- Bloquea rutas protegidas si el token no existe o es inválido.
- Maneja errores de la API (credenciales incorrectas/usuario inexistente).

**Tareas:**
- Listar: GET desde backend (solo tareas del usuario autenticado).
- Crear: Enviar título, imagen y ubicación al backend.
- Marcar completada/no completada: Actualizar en backend vía PATCH/PUT.
- Eliminar: Borrar en backend vía DELETE.

**Restricción obligatoria:**
- Las tareas deben estar asociadas al usuario autenticado.
- La API debe limitar la lista a ese usuario.

**Manejo de imágenes (opcional):**
- Captura desde dispositivo.
- Envío al servidor con multipart/form-data o base64 (según backend).
- Backend retorna URL; la app muestra esa URL en la lista.

**Variables de entorno:**
- Configurar la URL base del backend en `.env.local`:
  
  ```env
  EXPO_PUBLIC_API_URL=https://todo-list.dobleb.cl
  ```

## Implementación

- **Autenticación (login/registro):**
  - Pantalla en `app/login.tsx` con envío de credenciales al backend (`POST /auth/login`/`/auth/register`).
  - Token JWT persistido en AsyncStorage y usado en todos los requests vía `utils/api.ts`.
  - Protección de rutas mediante verificación de sesión en el layout y redirección a login si no hay token.

- **Lista de tareas (CRUD):**
  - Vista principal en `app/(tabs)/todos.tsx` consume `utils/tasks.ts`.
  - Listado: `GET /todos` del usuario autenticado.
  - Crear: título, imagen (subida a través de `POST /images`) y ubicación; luego `POST /todos` con la URL devuelta.
  - Completar/no completar: `PATCH /todos/{id}` actualiza estado en backend.
  - Eliminar: `DELETE /todos/{id}` borra la tarea en backend.

- **Imágenes y ubicación:**
  - Captura/selección con `expo-image-picker`; subida como multipart/form-data.
  - Ubicación obtenida con `expo-location` y adjunta al crear la tarea.

- **Proxy y cuenta demo:**
  - Proxy HTTP→HTTPS para evitar CORS/mixed content en Android durante pruebas.
  - Cuenta de pruebas: Usuario `admin`, Contraseña `admin123` para validar flujos rápidamente.

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