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
const IMAGES_KEY = '@eva2:images';

let apiInitialized = false;

export async function saveTaskImage(taskId: string, imageUrl: string): Promise<void> {
  try {
    const imagesJson = await AsyncStorage.getItem(IMAGES_KEY);
    const images = imagesJson ? JSON.parse(imagesJson) : {};
    images[taskId] = imageUrl;
    await AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(images));
  } catch (error) {
    // Manejar error silenciosamente
  }
}

export async function getTaskImage(taskId: string): Promise<string | undefined> {
  try {
    const imagesJson = await AsyncStorage.getItem(IMAGES_KEY);
    const images = imagesJson ? JSON.parse(imagesJson) : {};
    return images[taskId];
  } catch (error) {
    return undefined;
  }
}

export async function getAllTaskImages(): Promise<Record<string, string>> {
  try {
    const imagesJson = await AsyncStorage.getItem(IMAGES_KEY);
    return imagesJson ? JSON.parse(imagesJson) : {};
  } catch (error) {
    return {};
  }
}

export async function deleteTaskImage(taskId: string): Promise<void> {
  try {
    const imagesJson = await AsyncStorage.getItem(IMAGES_KEY);
    const images = imagesJson ? JSON.parse(imagesJson) : {};
    delete images[taskId];
    await AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(images));
  } catch (error) {
    // Manejar error silenciosamente
  }
}

async function ensureApiInitialized() {
  if (!apiInitialized) {
    await apiClient.initialize();
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
  } catch (error) {
    const apiError = error as ApiError;
    let errorMessage = apiError.message || 'Error al iniciar sesión';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
      errorMessage = 'Error de red. Si estás en navegador web, prueba en un dispositivo móvil. El servidor tiene problemas de CORS.';
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
    const images = await getAllTaskImages();
    
    return todos.map(todo => {
      const task = convertTodoToTask(todo);
      // Si hay imagen almacenada localmente, usarla
      if (images[task.id]) {
        task.image = images[task.id];
      }
      return task;
    });
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
      location: taskData.location || undefined,
    });
    const task = convertTodoToTask(todo);
    
    // Guardar la imagen localmente ya que el servidor no la almacena
    if (taskData.image) {
      await saveTaskImage(task.id, taskData.image);
      task.image = taskData.image;
    }
    
    return task;
  } catch (error) {
    return null;
  }
}

export async function removeTask(taskId: string): Promise<boolean> {
  try {
    await ensureApiInitialized();
    await apiClient.deleteTodo(taskId);
    // Eliminar imagen asociada del almacenamiento local
    await deleteTaskImage(taskId);
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
  return {
    id: todo.id,
    title: todo.title,
    image: normalizeImageUrl((todo as any).imageUrl ?? todo.image),
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
