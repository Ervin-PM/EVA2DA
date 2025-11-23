import { ThemedView } from '@/components/themed-view';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addTask, getCurrentUser, loadTasksForUser, removeTask, savePhotoToAppFolder, toggleComplete } from '../../utils/tasks';

export default function TodosScreen() {
  const [user, setUser] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // when modal opens, request location automatically and set it
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
        console.warn('auto location error', e);
      }
    })();
  }, [showModal]);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) {
        await refresh(u);
      }
    })();
  }, []);

  const refresh = async (u: string) => {
    setLoading(true);
    const all = await loadTasksForUser(u);
    setTasks(all);
    setLoading(false);
  };

  const onPickImage = async () => {
    // request media library permission first
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const mediaGranted = (mediaPerm as any).granted ?? (mediaPerm as any).status === 'granted';
    if (!mediaGranted) {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a las fotos');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    // support both older and newer API shapes
    if ((res as any).canceled === true || (res as any).canceled === undefined && (res as any).cancelled === true) return;
    const uri = (res as any).assets?.[0]?.uri ?? (res as any).uri;
    if (uri) setPhoto(uri);
  };

  const onTakePhoto = async () => {
    // request camera and media permissions
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
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
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
    let savedUri = photo;
    // ensure we have location at creation time
    if (!location) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch (e) {
        console.warn('location error', e);
      }
    }
    if (photo) {
      savedUri = await savePhotoToAppFolder(photo);
    }
    const t = await addTask(user, { title, photoUri: savedUri, location, completed: false, userId: user });
    setTasks((s) => [t, ...s]);
    setTitle('');
    setPhoto(undefined);
    setLocation(null);
    setShowModal(false);
  };

  const onRemove = async (id: string) => {
    if (!user) return;
    await removeTask(user, id);
    setTasks((s) => s.filter((t) => t.id !== id));
  };

  const onToggle = async (id: string) => {
    if (!user) return;
    await toggleComplete(user, id);
    await refresh(user);
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
        {/* use safe area inset to avoid overlap with status bar / native UI */}
        <Text style={styles.headerTitle}>Todos de {user}</Text>
        <Button title="Nueva tarea" onPress={() => setShowModal(true)} />
      </ThemedView>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => refresh(user)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, textDecorationLine: item.completed ? 'line-through' : 'none' }}>{item.title}</Text>
              {item.location && <Text style={styles.locationText}>Lat: {item.location.latitude.toFixed(4)} Lon: {item.location.longitude.toFixed(4)}</Text>}
            </View>
            {item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.thumb} /> : null}
            <Button title={item.completed ? 'Undo' : 'Done'} onPress={() => onToggle(item.id)} />
            <Button title="Eliminar" color="#c00" onPress={() => onRemove(item.id)} />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.center}><Text>No hay tareas aún.</Text></View>
        )}
      />

      <Modal visible={showModal} animationType="slide">
        <ThemedView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>Crear tarea</Text>
          <TextInput placeholder="Título" placeholderTextColor="#ddd" value={title} onChangeText={setTitle} style={styles.input} />
          <ThemedView style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Elegir foto" onPress={onPickImage} />
            <Button title="Tomar foto" onPress={onTakePhoto} />
            <Button title="Ubicación" onPress={onGetLocation} />
          </ThemedView>
          {photo ? <Image source={{ uri: photo }} style={{ width: 120, height: 120, marginTop: 12 }} /> : null}
          {location ? <Text style={[{ marginTop: 8 }, styles.locationText]}>Lat: {location.latitude} Lon: {location.longitude}</Text> : null}

          <ThemedView style={{ marginTop: 16 }}>
            <Button title="Crear" onPress={onCreate} />
            <Button title="Cancelar" onPress={() => setShowModal(false)} color="#888" />
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, marginRight: 8, borderRadius: 6 },
  input: { borderWidth: 1, borderColor: '#666', padding: 8, borderRadius: 6, marginTop: 8, color: '#fff' },
  locationText: { color: '#000' },
});
