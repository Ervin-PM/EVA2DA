import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text } from 'react-native';
import { getCurrentUser, logout } from '../../utils/tasks';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace('/login');
        return;
      }
      setUser(u);
    })();
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <Text style={[styles.title, { textAlign: 'center' }]}>Bienvenido a Liceo Hardware</Text>
      {user ? (
        <>
          <Text style={styles.user}>Usuario: {user}</Text>
          <Button title="Cerrar sesión" onPress={async () => { await logout(); router.replace('/login'); }} />
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  user: { marginTop: 12, fontSize: 16, color: '#ffffff' },
});
