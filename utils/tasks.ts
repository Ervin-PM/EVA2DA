import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient, ApiError, AuthResponse, normalizeImageUrl, Todo } from './api';

export type Task = {
  id: string;
  title: string;
  image?: string;
  location?: { latitude: number; longitude: number } | null;
  completed: boolean;
  createdAt: string;
  userId: string;
};

const USER_KEY = '@eva2:currentUserId';
const IMAGE_MAP_KEY = '@eva2:imageMap';

let apiInitialized = false;
// Mapa en memoria para asociar URLs de imágenes a IDs de tareas creadas
const imageMap: Record<string, string> = {};

// Cargar mapa de imágenes desde AsyncStorage
async function loadImageMap() {
  try {
    const stored = await AsyncStorage.getItem(IMAGE_MAP_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(imageMap, parsed);
      console.log('📂 ImageMap cargado desde storage:', Object.keys(imageMap).length, 'entradas');
    }
  } catch (e) {
    console.warn('Error cargando imageMap:', e);
  }
}

// Guardar mapa de imágenes en AsyncStorage
async function saveImageMap() {
  try {
    await AsyncStorage.setItem(IMAGE_MAP_KEY, JSON.stringify(imageMap));
  } catch (e) {
    console.warn('Error guardando imageMap:', e);
  }
}

async function ensureApiInitialized() {
  if (!apiInitialized) {
    await apiClient.initialize();
    await loadImageMap();
    apiInitialized = true;
  }
}

export async function getCurrentUser(): Promise<string | null> {
  try {
    const userId = await AsyncStorage.getItem(USER_KEY);
    return userId;
  } catch (e) {
    return null;
  }
}

export async function setCurrentUser(userId: string) {
  try {
    await AsyncStorage.setItem(USER_KEY, userId);
  } catch (e) {
    // Manejar error silenciosamente
  }
}

export async function logout() {
  try {
    await AsyncStorage.removeItem(USER_KEY);
    await apiClient.clearToken();
  } catch (e) {
    // Manejar error silenciosamente
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureApiInitialized();
    const response: AuthResponse = await apiClient.login(email, password);
    await setCurrentUser(response.user.id);
    return { success: true };
  } catch (error: any) {
    const apiError = error as ApiError;
    let errorMessage = apiError.message || 'Error al iniciar sesión';
    
    // Manejo específico de errores HTTP
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
        if (data?.message) {
          errorMessage = data.message;
        }
      } else if (status === 401) {
        errorMessage = 'Email o contraseña incorrectos.';
      } else if (status === 404) {
        errorMessage = 'Usuario no encontrado. ¿Necesitas registrarte?';
      } else if (status >= 500) {
        errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
      }
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
      errorMessage = 'Error de red. Verifica tu conexión a internet.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureApiInitialized();
    const response: AuthResponse = await apiClient.register(email, password);
    await setCurrentUser(response.user.id);
    return { success: true };
  } catch (error) {
    const apiError = error as ApiError;
    let errorMessage = apiError.message || 'Error al registrar usuario';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
      errorMessage = 'Error de red. Si estás en navegador web, prueba en un dispositivo móvil. El servidor tiene problemas de CORS.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function loadTasksForUser(): Promise<Task[]> {
  try {
    await ensureApiInitialized();
    const todos: Todo[] = await apiClient.getTodos();
    
    // Las tareas vienen directamente del backend sin persistencia local
    return todos.map(todo => convertTodoToTask(todo));
  } catch (error) {
    return [];
  }
}

export async function addTask(taskData: {
  title: string;
  image?: string;
  location?: { latitude: number; longitude: number } | null;
}): Promise<Task | null> {
  try {
    await ensureApiInitialized();
    const todo: Todo = await apiClient.createTodo({
      title: taskData.title,
      image: taskData.image,
      imageUrl: taskData.image,
      url: taskData.image,
      photo: taskData.image,
      location: taskData.location || undefined,
    });
    // Debug: mostrar qué campos trae la tarea desde el backend
    try {
      console.log('Todo creado (raw):', JSON.stringify(todo));
    } catch {}
    // Asociar imagen subida al ID si el backend no la devuelve
    if (taskData.image && todo?.id) {
      const norm = normalizeImageUrl(taskData.image);
      if (norm) {
        imageMap[todo.id] = norm;
        await saveImageMap();
        console.log('💾 Guardando en imageMap (persistente):', { todoId: todo.id, imageUrl: norm });
      }
    }
    
    // Las imágenes se almacenan en el backend, no localmente
    const converted = convertTodoToTask(todo);
    if (!converted.image && taskData.image) {
      // Intento de actualización si el backend no guardó la URL en create
      try {
        const updated = await apiClient.updateTodo(todo.id, {
          image: taskData.image,
          imageUrl: taskData.image,
          url: taskData.image,
          photo: taskData.image,
        });
        try { console.log('Todo actualizado (raw):', JSON.stringify(updated)); } catch {}
        // Leer la versión final desde el backend
        try {
          const finalTodo = await apiClient.getTodo(todo.id);
          try { console.log('Todo final (raw):', JSON.stringify(finalTodo)); } catch {}
          // Si aún no hay imagen persistida, mantener asociación en memoria
          if (!finalTodo?.image && taskData.image) {
            const norm = normalizeImageUrl(taskData.image);
            if (norm) {
              imageMap[todo.id] = norm;
              await saveImageMap();
            }
          }
          return convertTodoToTask(finalTodo);
        } catch {
          return convertTodoToTask(updated);
        }
      } catch (e) {
        // Si falla, devolvemos el original sin imagen
        return converted;
      }
    }
    return converted;
  } catch (error) {
    return null;
  }
}

export async function removeTask(taskId: string): Promise<boolean> {
  try {
    await ensureApiInitialized();
    await apiClient.deleteTodo(taskId);
    // Limpiar del imageMap si existe
    if (imageMap[taskId]) {
      delete imageMap[taskId];
      await saveImageMap();
      console.log('🗑️ Imagen removida del mapa:', taskId);
    }
    return true;
  } catch (error) {
    return false;
  }
}

export async function toggleComplete(taskId: string): Promise<boolean> {
  try {
    await ensureApiInitialized();
    // Primero obtenemos la tarea para saber su estado actual
    const todo: Todo = await apiClient.getTodo(taskId);
    // Luego la actualizamos con el estado opuesto
    await apiClient.toggleTodo(taskId, !todo.completed);
    return true;
  } catch (error) {
    const apiError = error as ApiError;
    console.warn('toggleComplete error', apiError.message);
    return false;
  }
}

function convertTodoToTask(todo: Todo): Task {
  const resolveImageUrl = (t: any): string | undefined => {
    const candidates = [
      t?.imageUrl,
      t?.image,
      t?.url,
      t?.photo,
      t?.path,
      t?.location, // algunos backends devuelven la URL bajo 'location' del upload
      t?.data?.imageUrl,
      t?.data?.url,
    ];
    for (const v of candidates) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    // Buscar en arrays comunes: attachments, files, images
    const arrays = [t?.attachments, t?.files, t?.images];
    for (const arr of arrays) {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const url = typeof item === 'string' ? item : (item?.url || item?.imageUrl || item?.path);
          if (typeof url === 'string' && url.trim()) return url.trim();
        }
      }
    }
    // Mapa en memoria por si el backend no persiste la imagen
    if (t?.id && imageMap[t.id]) {
      console.log('🖼️ Recuperando imagen de memoria para todo:', t.id, '→', imageMap[t.id]);
      return imageMap[t.id];
    }
    return undefined;
  };

  return {
    id: todo.id,
    title: todo.title,
    image: normalizeImageUrl(resolveImageUrl(todo)),
    location: todo.location || null,
    completed: todo.completed,
    createdAt: todo.createdAt || new Date().toISOString(),
    userId: todo.userId,
  };
}

export async function savePhotoToAppFolder(uri: string): Promise<string> {
  try {
    const fileName = uri.split('/').pop();
    const dest = `${FileSystem.documentDirectory}photos/${Date.now()}-${fileName}`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos`, {
      intermediates: true,
    });
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (e) {
    console.warn('savePhotoToAppFolder error', e);
    return uri;
  }
}
