import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiClient } from '../utils/api';
import getImageUploadService from '../utils/image-upload-service';
import { addTask, getCurrentUser, loadTasksForUser, removeTask, Task, toggleComplete } from '../utils/tasks';

interface UseTasksResult {
  user: string | null;
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (data: {
    title: string;
    photo?: string;
    location?: { latitude: number; longitude: number } | null;
  }) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
}

export function useTodos(): UseTasksResult {
  const [user, setUser] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Cargar usuario y tareas al montar el componente
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace('/login');
        return;
      }
      setUser(u);
      await refresh();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para refrescar la lista de tareas
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await loadTasksForUser();
      setTasks(all);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  // Función para crear una nueva tarea
  const createTask = async (data: {
    title: string;
    photo?: string;
    location?: { latitude: number; longitude: number } | null;
  }): Promise<boolean> => {
    if (!user) {
      router.push('/login');
      return false;
    }

    if (!data.title) {
      Alert.alert('Error', 'Ingrese un título');
      return false;
    }

    try {
      let imageUrl: string | undefined = undefined;

      // Subir imagen al servidor si fue seleccionada
      if (data.photo) {
        try {
          const token = apiClient.getToken();
          if (!token) {
            Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión para subir imágenes.');
            router.push('/login');
            return false;
          }

          const reduceImage = async (srcUri: string): Promise<string> => {
            try {
              const pass = async (uri: string, width: number, compress: number) => {
                const manip = await ImageManipulator.manipulateAsync(
                  uri,
                  [{ resize: { width } }],
                  { compress, format: ImageManipulator.SaveFormat.JPEG }
                );
                return manip.uri;
              };

              let optimized = await pass(srcUri, 800, 0.4);

              const info1 = await FileSystem.getInfoAsync(optimized);
              const sizeMB1 = ((info1 as any).size || 0) / (1024 * 1024);
              if (sizeMB1 > 5) {
                optimized = await pass(optimized, 640, 0.3);
              }
              return optimized;
            } catch (e) {
              console.warn('Error reducing image:', e);
              return srcUri;
            }
          };

          const optimizedUri = await reduceImage(data.photo);
          const fileInfo = await FileSystem.getInfoAsync(optimizedUri);
          const fileSizeMB = ((fileInfo as any).size || 0) / (1024 * 1024);

          if (fileSizeMB > 5) {
            Alert.alert(
              'Archivo muy grande',
              `La imagen pesa ${fileSizeMB.toFixed(2)}MB. Máximo permitido: 5MB`
            );
            return false;
          }

          const fileName = data.photo.split('/').pop() || 'photo.jpg';
          const fileType = 'image/jpeg';

          console.log('📤 Iniciando subida de imagen:', { uri: optimizedUri, name: fileName, type: fileType });
          
          const { uploadImage } = getImageUploadService({ token });
          const uploadedUrl = await uploadImage({
            uri: optimizedUri,
            name: fileName,
            type: fileType,
            userId: user || undefined,
          });
          
          console.log('✅ URL recibida del servidor:', uploadedUrl);
          
          // Normalizar por si el backend devuelve ruta relativa o dominio remoto
          imageUrl = (await import('../utils/api')).normalizeImageUrl(uploadedUrl);
          
          console.log('🔗 URL normalizada para guardar:', imageUrl);
        } catch (uploadError) {
          const status = (uploadError as any)?.status || (uploadError as any)?.response?.status;
          const message = (uploadError as any)?.message || 'No se pudo subir la imagen';
          if (status === 413) {
            Alert.alert(
              'Imagen demasiado grande',
              'No se pudo subir la imagen porque supera el tamaño permitido. La tarea se guardará sin imagen.'
            );
          } else {
            Alert.alert(
              'Error subiendo imagen',
              `${message}. La tarea se guardará sin imagen.`
            );
          }
          // Continuar sin imagen en lugar de fallar completamente
          imageUrl = undefined;
        }
      }

      // Crear tarea en el servidor
      const newTask = await addTask({
        title: data.title,
        image: imageUrl,
        location: data.location || undefined,
      });

      if (newTask) {
        await refresh();
        return true;
      } else {
        Alert.alert('Error', 'No se pudo crear la tarea');
        return false;
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Ocurrió un error al crear la tarea');
      return false;
    }
  };

  // Función para eliminar una tarea
  const deleteTask = async (id: string) => {
    if (!user) return;
    const success = await removeTask(id);
    if (success) {
      setTasks((s) => s.filter((t) => t.id !== id));
      Alert.alert('Éxito', 'Tarea eliminada');
    } else {
      Alert.alert('Error', 'No se pudo eliminar la tarea');
    }
  };

  // Función para marcar/desmarcar tarea como completada
  const toggleTaskComplete = async (id: string) => {
    if (!user) return;
    const success = await toggleComplete(id);
    if (success) {
      await refresh();
    } else {
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  return {
    user,
    tasks,
    loading,
    error,
    refresh,
    createTask,
    deleteTask,
    toggleTaskComplete,
  };
}
