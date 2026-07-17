import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTripStore } from '@/storage/store';
import { colors, type } from '@/theme/tokens';

export default function RootLayout() {
  const hydrated = useTripStore((s) => s.hydrated);
  const setHydrated = useTripStore((s) => s.setHydrated);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    // zustand persist may already be done before mount
    const unsub = useTripStore.persist.onFinishHydration(() => setHydrated(true));
    if (useTripStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [setHydrated]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootBrand}>PaiShare</Text>
        <ActivityIndicator color={colors.mint} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.paper },
          headerTitleStyle: {
            fontFamily: type.bodySemi,
            color: colors.ink,
          },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="trip/new" options={{ title: '新行程' }} />
        <Stack.Screen name="trip/[id]/index" options={{ title: '行程' }} />
        <Stack.Screen name="trip/[id]/expense" options={{ title: '記一筆' }} />
        <Stack.Screen name="trip/[id]/settle" options={{ title: '結算' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.paper,
  },
  bootBrand: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
  },
});
