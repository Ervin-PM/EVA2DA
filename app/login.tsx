import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { authenticateUser, registerUser } from '../utils/tasks';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const onSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Ingrese usuario y contraseña');
      return;
    }
    const user = username.trim();
    if (mode === 'login') {
      const res = await authenticateUser(user, password);
      if (res === 'ok') {
        router.replace('/');
        return;
      }
      if (res === 'not-found') {
        Alert.alert('Usuario no encontrado', 'Regístrese primero o verifique el nombre de usuario');
        return;
      }
      Alert.alert('Error', 'Contraseña incorrecta');
      return;
    }

    // register
    const reg = await registerUser(user, password);
    if (reg === 'created') {
      Alert.alert('Usuario creado', 'Registro exitoso. Ya estás logueado.');
      router.replace('/');
      return;
    }
    if (reg === 'exists') {
      Alert.alert('Usuario existente', 'El usuario ya existe. Inicia sesión.');
      setMode('login');
      return;
    }
    Alert.alert('Error', 'No se pudo crear el usuario');
  };

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.title}>{mode === 'login' ? 'Iniciar sesión' : 'Registrar usuario'}</Text>
      <TextInput
        placeholder="Usuario"
        placeholderTextColor="#ddd"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Contraseña"
        placeholderTextColor="#ddd"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title={mode === 'login' ? 'Entrar' : 'Registrar'} onPress={onSubmit} />
      <View style={{ height: 12 }} />
      <Button
        title={mode === 'login' ? '¿No tienes cuenta? Registrarse' : '¿Ya tienes cuenta? Iniciar sesión'}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        color="#666"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, marginBottom: 12, textAlign: 'center', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#444', padding: 8, marginBottom: 12, borderRadius: 6, color: '#fff' },
});
