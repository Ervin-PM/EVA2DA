import { ThemedView } from '@/components/themed-view';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../utils/api';
import { addTask, getCurrentUser, loadTasksForUser, removeTask, Task, toggleComplete } from '../../utils/tasks';

export default function TodosScreen() {
  const [user, setUser] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<any>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!showModal) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso de ubicación', 'No se otorgó permiso para obtener la ubicación automáticamente. Puedes proporcionarla manualmente.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        // Manejar error silenciosamente
      }
    })();
  }, [showModal]);

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
  }, []);

  const refresh = async () => {
    setLoading(true);
    const all = await loadTasksForUser();
    setTasks(all);
    setLoading(false);
  };

  const onPickImage = async () => {
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // soportar versiones antiguas y nuevas de la API
    const mediaGranted = (mediaPerm as any).granted ?? (mediaPerm as any).status === 'granted';
    if (!mediaGranted) {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a las fotos');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.3 });
    // soportar versiones antiguas y nuevas de la API
    if ((res as any).canceled === true || (res as any).canceled === undefined && (res as any).cancelled === true) return;
    const uri = (res as any).assets?.[0]?.uri ?? (res as any).uri;
    if (uri) setPhoto(uri);
  };

  const onTakePhoto = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPerm2 = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camGranted = (camPerm as any).granted ?? (camPerm as any).status === 'granted';
    const mediaGranted2 = (mediaPerm2 as any).granted ?? (mediaPerm2 as any).status === 'granted';
    if (!camGranted) {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para usar la cámara');
      return;
    }
    if (!mediaGranted2) {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para guardar la foto en la galería');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.3 });
    if ((res as any).canceled === true || (res as any).canceled === undefined && (res as any).cancelled === true) return;
    const uri = (res as any).assets?.[0]?.uri ?? (res as any).uri;
    if (uri) setPhoto(uri);
  };

  const onGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a la ubicación');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  };

  const onCreate = async () => {
    if (!user) return router.push('/login');
    if (!title) return Alert.alert('Error', 'Ingrese un título');

    setCreatingTask(true);

    try {
      if (!location) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        } catch (e) {
          // Manejar error silenciosamente
        }
      }

      let imageUrl: string | undefined = undefined;

      // Subir imagen al servidor si fue seleccionada
      if (photo) {
        try {
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
              const sizeMB1 = (info1.size || 0) / (1024 * 1024);
              if (sizeMB1 > 5) {
                optimized = await pass(optimized, 640, 0.3);
              }
              return optimized;
            } catch (e) {
              return srcUri;
            }
          };
          const optimizedUri = await reduceImage(photo);
          const fileInfo = await FileSystem.getInfoAsync(optimizedUri);
          const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
          
          if (fileSizeMB > 5) {
            Alert.alert('Archivo muy grande', `La imagen pesa ${fileSizeMB.toFixed(2)}MB. Máximo permitido: 5MB`);
            setCreatingTask(false);
            return;
          }

          const fileName = photo.split('/').pop() || 'photo.jpg';
          const fileType = 'image/jpeg';

          const uploadResult = await apiClient.uploadImage({ uri: optimizedUri, name: fileName, type: fileType });
          // El servidor devuelve { url, key, size, contentType }
          imageUrl = uploadResult.url || uploadResult.imageUrl;
          // Normalizar por si el backend devuelve ruta relativa o dominio remoto
          imageUrl = (await import('../../utils/api')).normalizeImageUrl(imageUrl);
        } catch (uploadError) {
          const status = (uploadError as any)?.response?.status;
          if (status === 413) {
            Alert.alert(
              'Imagen demasiado grande',
              'No se pudo subir la imagen porque supera el tamaño permitido. La tarea se guardará sin imagen.'
            );
          } else {
            Alert.alert(
              'Error subiendo imagen',
              'No se pudo subir la imagen por un error de red o servidor. La tarea se guardará sin imagen.'
            );
          }
          // Continuar sin imagen en lugar de fallar completamente
          imageUrl = undefined;
        }
      }

      // Crear tarea en el servidor
      const newTask = await addTask({
        title,
        image: imageUrl,
        location: location || undefined,
      });

      if (newTask) {
        await refresh();
        setTitle('');
        setPhoto(undefined);
        setLocation(null);
        setShowModal(false);
        Alert.alert('Éxito', 'Tarea creada correctamente');
      } else {
        Alert.alert('Error', 'No se pudo crear la tarea');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al crear la tarea');
    } finally {
      setCreatingTask(false);
    }
  };

  const onRemove = async (id: string) => {
    if (!user) return;
    const success = await removeTask(id);
    if (success) {
      setTasks((s) => s.filter((t) => t.id !== id));
      Alert.alert('Éxito', 'Tarea eliminada');
    } else {
      Alert.alert('Error', 'No se pudo eliminar la tarea');
    }
  };

  const onToggle = async (id: string) => {
    if (!user) return;
    const success = await toggleComplete(id);
    if (success) {
      await refresh();
    } else {
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.center}>
        <Text style={{ color: '#fff' }}>No hay usuario logueado.</Text>
        <Button title="Ir a Login" onPress={() => router.push('/login')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ThemedView style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Text style={styles.headerTitle}>Mis tareas</Text>
        <Button title="Nueva" onPress={() => setShowModal(true)} />
      </ThemedView>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => refresh()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, textDecorationLine: item.completed ? 'line-through' : 'none', color: '#fff' }}>{item.title}</Text>
              {item.location && <Text style={styles.locationText}>Lat: {item.location.latitude.toFixed(4)} Lon: {item.location.longitude.toFixed(4)}</Text>}
            </View>
            {item.image ? (
              <ExpoImage
                source={{ uri: item.image }}
                style={styles.thumb}
                cachePolicy="memory-disk"
              />
            ) : null}
            <Button title={item.completed ? 'Undo' : 'Done'} onPress={() => onToggle(item.id)} />
            <Button title="Del" color="#c00" onPress={() => onRemove(item.id)} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Text style={{ color: '#fff' }}>No hay tareas aún.</Text>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide">
        <ThemedView style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 18, marginBottom: 16, color: '#fff' }}>Crear nueva tarea</Text>
            <TextInput
              placeholder="Título"
              placeholderTextColor="#ddd"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              editable={!creatingTask}
            />
            <ThemedView style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Button title="Elegir foto" onPress={onPickImage} disabled={creatingTask} />
              <Button title="Tomar foto" onPress={onTakePhoto} disabled={creatingTask} />
              <Button title="Ubicación" onPress={onGetLocation} disabled={creatingTask} />
            </ThemedView>
            {photo ? (
              <ExpoImage
                source={{ uri: photo }}
                style={{ width: 120, height: 120, marginTop: 12, borderRadius: 6 }}
              />
            ) : null}
            {location ? (
              <Text style={[{ marginTop: 12, color: '#000' }]}>
                📍 Lat: {location.latitude.toFixed(4)} Lon: {location.longitude.toFixed(4)}
              </Text>
            ) : null}
          </View>

          <ThemedView style={{ gap: 8 }}>
            {creatingTask && <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 8 }} />}
            <Button title="Crear tarea" onPress={onCreate} disabled={creatingTask} />
            <Button title="Cancelar" onPress={() => setShowModal(false)} color="#888" disabled={creatingTask} />
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#444', flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  input: { borderWidth: 1, borderColor: '#666', padding: 12, borderRadius: 6, color: '#fff', fontSize: 16 },
  locationText: { color: '#000', marginTop: 4, fontSize: 12 },
});
