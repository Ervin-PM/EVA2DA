## Link video funcionamiento
- https://ipciisa-my.sharepoint.com/:v:/g/personal/ervin_pinto_madariaga_estudiante_ipss_cl/IQBbp0v3SwPzS5Y4m-lM-HrzAfOTQdU-mkodZ1DgRi30H94?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=2KbxLI

## Dependencias (Funcionamiento de proyecto)

Estas son las dependencias que deben estar instaladas para que el proyecto funcione tal y como está en el repositorio:

- @expo/vector-icons ^15.0.3
- @react-native-async-storage/async-storage ^1.17.11
- @react-navigation/bottom-tabs ^7.4.0
- @react-navigation/elements ^2.6.3
- @react-navigation/native ^7.1.8
- expo ~54.0.25
- expo-constants ~18.0.10
- expo-file-system ~19.0.19
- expo-font ~14.0.9
- expo-haptics ~15.0.7
- expo-image ~3.0.10
- expo-image-picker ~17.0.8
- expo-linear-gradient ^15.0.7
- expo-linking ~8.0.9
- expo-location ~19.0.7
- expo-router ~6.0.15
- expo-splash-screen ~31.0.11
- expo-status-bar ~3.0.8
- expo-symbols ~1.0.7
- expo-system-ui ~6.0.8
- expo-web-browser ~15.0.9
- react 19.1.0
- react-dom 19.1.0
- react-native 0.81.5
- react-native-gesture-handler ~2.28.0
- react-native-reanimated ~4.1.1
- react-native-safe-area-context ~5.6.0
- react-native-screens ~4.16.0
- react-native-web ~0.21.0
- react-native-worklets 0.5.1

DevDependencies:

- @types/react ~19.1.0
- eslint ^9.25.0
- eslint-config-expo ~10.0.0
- typescript ~5.9.2

Nota: algunas de estas dependencias son paquetes `expo` y deben instalarse preferentemente usando `npx expo install <package>` para asegurar compatibilidad con la versión de SDK de Expo.

## Detalles de la realización (por archivo)

Este proyecto fue modificado para cumplir los requisitos de la evaluación: login, tareas por usuario, fotos y localización, persistencia y un fondo visual consistente. A continuación se detallan los cambios más importantes con la ruta de los archivos y una breve descripción técnica.

- `utils/tasks.ts`
   - Modelo `Task` y funciones para: obtener/guardar usuario actual (`getCurrentUser`, `setCurrentUser`, `logout`), gestión de usuarios (`getUsers`, `saveUsers`, `authenticateUser`, `registerUser`), persistencia de tareas por usuario (`loadTasksForUser`, `saveTasksForUser`) y utilitarios (`addTask`, `removeTask`, `toggleComplete`, `savePhotoToAppFolder`).
   - Guarda tareas en `AsyncStorage` bajo claves por-usuario y copia fotos al directorio de la app con `expo-file-system`.

- `components/themed-view.tsx`
   - Componente central que aplica un `LinearGradient` global (colores: `#0B5FA5`, `#3F88C5`, `#FFD400`) y deja el contenido con fondo transparente para que todo muestre el mismo gradiente.

- `components/themed-text.tsx`
   - Componente de texto con tipos (`default`, `title`, `defaultSemiBold`, `subtitle`, `link`). Los títulos (`type="title"`) ahora se muestran en blanco y con fondo transparente para integrarse con el gradiente de la vista.

- `app/(tabs)/_layout.tsx`
   - Configuración de pestañas (Expo Router Tabs). Se cambió la etiqueta de la pestaña `todos` a `Lista`.

- `app/(tabs)/index.tsx`
   - Pantalla Home: carga el usuario actual con `getCurrentUser`, redirige a `/login` si no hay usuario, muestra título y nombre de usuario cuando está logueado y permite `logout`.

- `app/(tabs)/todos.tsx`
   - Implementa la lista de tareas del usuario actual (carga desde `loadTasksForUser`), crea tareas mediante modal (título, foto, ubicación), solicita permisos (cámara/galería/ubicación), guarda la foto con `savePhotoToAppFolder`, y persiste la tarea asociada al usuario.
   - UI: modal de creación adaptado para mostrar texto blanco, `TextInput` con placeholder legible, y ubicaciones en texto negro para contraste.

- `app/login.tsx`
   - Login / Registro simple con usuario y contraseña. Usa `authenticateUser` / `registerUser` (persistencia en `AsyncStorage`). El layout ahora usa `ThemedView` para mantener el fondo global.

- `app/(tabs)/explore.tsx`
   - Actualizada para mostrar un mensaje `En construcción` con `ThemedView`.

- `components/parallax-scroll-view.tsx` y `components/ui/collapsible.tsx`
   - Ajustados para usar `ThemedView` y permitir que el gradiente se muestre detrás de contenidos con parallax y secciones colapsables.

- `app.json`
   - (Se añadieron/pueden añadirse) strings de uso para iOS (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`) y permisos Android (`CAMERA`, `READ/WRITE_EXTERNAL_STORAGE`, `ACCESS_FINE_LOCATION`, etc.). Revisa el archivo para confirmar dichos valores si se necesita build nativo.

## Permisos y comportamiento por plataforma

- La app solicita permisos en tiempo de ejecución para cámara/galería (`expo-image-picker`) y ubicación (`expo-location`). En Android 13+ el comportamiento de permisos de medios puede requerir un `dev-client` o una build personalizada (EAS) para pruebas completas.

## Notas de pruebas y pasos recomendados

1. Instalar dependencias:
```powershell
npm install
npx expo install expo-file-system expo-image-picker expo-location expo-linear-gradient @react-native-async-storage/async-storage
```
2. Iniciar Metro y limpiar caché:
```powershell
npx expo start -c
```
3. En el dispositivo/emulador: Registrar o iniciar sesión (usuario de ejemplo: `admin` / `admin123`).
4. Navegar a la pestaña `Lista` y crear tareas: probar tomar foto, seleccionar foto, aceptar permiso de ubicación.

## Limitaciones conocidas y recomendaciones

- Las contraseñas se almacenan en texto plano en `AsyncStorage` (solo para demo). Para producción se debe usar hashing y almacenamiento seguro.
- Algunas APIs nativas (por ejemplo permisos más recientes, acceso a la galería en Android 13) pueden requerir builds personalizados fuera de Expo Go.
- Recomendado: probar en dispositivo físico para validar camera/imagen/ubicación.

Luego ejecuta el proyecto:

```powershell
npm install
npx expo start
```

## Informe de cambios (Resumen de lo realizado)

- Se implementó autenticación simple por usuario (login/registro) y persistencia del usuario en `AsyncStorage`.
- Se desarrolló un listado de tareas (ahora etiquetado como `Lista`) en `app/(tabs)/todos.tsx` con creación, eliminación y marcado de tareas.
- Cada tarea puede incluir: título, foto (guardada en la carpeta de la app usando `expo-file-system`) y ubicación (obtenida con `expo-location`).
- Persistencia: las tareas se guardan por usuario usando claves por-usuario en `AsyncStorage`.
- Fondo global: todas las vistas principales usan un único `LinearGradient` (colores: `#0B5FA5` → `#3F88C5` → `#FFD400`) a través del componente `components/themed-view.tsx`.
- Titulares/títulos: los textos de tipo `title` ahora se muestran en blanco y dejan ver el gradiente de fondo (fondo transparente, para integración visual uniforme).
- Permisos: se solicitaron permisos en tiempo de ejecución para cámara/galería y ubicación; algunas plataformas (Android 13+) pueden requerir un build personalizado para permisos avanzados.
- Ajustes UI: formularios y textos en modales se adaptaron a colores legibles sobre el gradiente; las ubicaciones se muestran en texto negro para mejor contraste.

## Usuario de pruebas

Para facilitar pruebas, puedes usar este usuario de pruebas que ya está pensado para la demo local (los usuarios se crean/guardan en `AsyncStorage` del dispositivo/emulador):

- Usuario: `admin`
- Contraseña: `admin123`

Instrucciones rápidas:

1. Inicia la app: `npx expo start` y abre en Expo Go o emulador.
2. En la pantalla de login, ingresa `admin` / `admin123` y presiona `Entrar`.
3. Ve a la pestaña `Lista` para crear tareas de prueba (puedes tomar o seleccionar una foto y aceptar la solicitud de ubicación).

Nota de seguridad: las contraseñas se almacenan en texto plano en `AsyncStorage` para simplificar la evaluación. En una app real se debe usar hashing y almacenamiento seguro.