import { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/ScreenWash';
import { Button } from '@/components/Button';
import { useTripStore } from '@/storage/store';
import type { Trip } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const trips = useTripStore((s) => s.trips);

  const renderItem = useCallback(
    ({ item }: { item: Trip }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/trip/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.people.length} 人 · {item.expenses.length} 筆支出
        </Text>
      </Pressable>
    ),
    [router],
  );

  return (
    <ScreenWash>
      <View style={[styles.hero, { paddingTop: insets.top + space[5] }]}>
        <Text style={styles.brand}>PaiShare</Text>
        <Text style={styles.tagline}>同行雜支，當天結束一次結清</Text>
        <Link href="/trip/new" asChild>
          <Button label="建立行程" style={styles.cta} />
        </Link>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space[6] },
          trips.length === 0 && styles.listEmpty,
        ]}
        ListHeaderComponent={
          trips.length > 0 ? <Text style={styles.section}>行程</Text> : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>還沒有行程。先建立一趟，再把餐費、檯費、打牌輸贏記進去。</Text>
        }
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    gap: space[3],
  },
  brand: {
    fontFamily: type.brand,
    fontSize: fontSize.display,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    maxWidth: 280,
    lineHeight: 24,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: space[2],
    backgroundColor: colors.mint,
  },
  list: {
    paddingHorizontal: space[5],
    gap: space[3],
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  section: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: space[2],
  },
  card: {
    padding: space[4],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space[1],
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardTitle: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  cardMeta: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  empty: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: space[4],
  },
});
