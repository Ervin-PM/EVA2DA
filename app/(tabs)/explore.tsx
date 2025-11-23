import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
        En construcción
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({});
