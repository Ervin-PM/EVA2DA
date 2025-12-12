import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { authenticateUser, registerUser } from '../utils/tasks';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async () => {
    
    if (!email || !password) {
      Alert.alert('Error', 'Ingrese email y contraseña');
      return;
    }

    setLoading(true);
    const userEmail = email.trim();

    try {
      if (mode === 'login') {
        const res = await authenticateUser(userEmail, password);
        if (res.success) {
          router.replace('/');
          return;
        }
        Alert.alert('Error de autenticación', res.error || 'Error desconocido');
        return;
      }

      // registro
      const reg = await registerUser(userEmail, password);
      if (reg.success) {
        Alert.alert('Registro exitoso', 'Tu cuenta ha sido creada. Ya estás logueado.');
        router.replace('/');
        return;
      }
      Alert.alert('Error en el registro', reg.error || 'No se pudo crear el usuario');
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.title}>{mode === 'login' ? 'Iniciar sesión' : 'Registrar usuario'}</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor="#ddd"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        placeholder="Contraseña"
        placeholderTextColor="#ddd"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        editable={!loading}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 16 }} />
      ) : (
        <>
          <Button 
            title={mode === 'login' ? 'Entrar' : 'Registrar'} 
            onPress={() => {
              console.log('[LoginScreen] Button pressed!');
              onSubmit();
            }} 
          />
          <View style={{ height: 12 }} />
          <Button
            title={mode === 'login' ? '¿No tienes cuenta? Registrarse' : '¿Ya tienes cuenta? Iniciar sesión'}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            color="#666"
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, marginBottom: 12, textAlign: 'center', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#444', padding: 8, marginBottom: 12, borderRadius: 6, color: '#fff' },
});
