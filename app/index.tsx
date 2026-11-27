import { useCallback, useEffect } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ScreenWash } from '@/components/ScreenWash';
import { Button } from '@/components/Button';
import { PressScale } from '@/components/PressScale';
import { useTripStore } from '@/storage/store';
import type { Trip } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

function Seal() {
  const turns = useSharedValue(0);
  const reduce = useSharedValue(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) reduce.value = on;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduce.value = on;
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [reduce]);

  const gem = useAnimatedStyle(() => ({
    transform: [{ rotate: `${45 + turns.value * 90}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="轉動印記"
      hitSlop={10}
      onPress={() => {
        if (!reduce.value) turns.value = withTiming(turns.value + 1, { duration: 480 });
      }}
      style={styles.flourish}
    >
      <View style={styles.flourishRails}>
        <View style={styles.flourishLine} />
        <View style={styles.flourishLineSoft} />
      </View>
      <Animated.View style={[styles.flourishGem, gem]} />
      <View style={styles.flourishRails}>
        <View style={styles.flourishLine} />
        <View style={styles.flourishLineSoft} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const trips = useTripStore((s) => s.trips);

  const renderItem = useCallback(
    ({ item }: { item: Trip }) => (
      <PressScale
        accessibilityRole="button"
        onPress={() => router.push(`/trip/${item.id}`)}
        style={styles.card}
      >
        <View style={styles.cardTitleRow}>
          <View style={styles.cardGem} />
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {item.people.length} 人 · {item.expenses.length} 筆支出
        </Text>
      </PressScale>
    ),
    [router],
  );

  return (
    <ScreenWash>
      <View style={[styles.hero, { paddingTop: insets.top + space[5] }]}>
        <View style={styles.plaque}>
          <View style={styles.plaqueInner}>
            <Text style={styles.kicker}>同行帳冊</Text>
            <Text style={styles.brand}>PaiShare</Text>
            <Seal />
            <Text style={styles.tagline}>同行雜支，當天結束一次結清</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <Link href="/trip/new" asChild>
            <Button label="建立行程" style={styles.cta} />
          </Link>
          <Link href="/stats" asChild>
            <Button label="戰績" variant="secondary" style={styles.statsBtn} />
          </Link>
        </View>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: space[5] },
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
  plaque: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.brass,
    backgroundColor: colors.white,
    padding: 5,
  },
  plaqueInner: {
    borderWidth: 1,
    borderColor: colors.brassBright,
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    gap: space[2],
  },
  kicker: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.xs,
    letterSpacing: 4,
    color: colors.brass,
  },
  brand: {
    fontFamily: type.brand,
    fontSize: fontSize.display,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  flourish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  flourishRails: { gap: 3 },
  flourishLine: {
    width: 64,
    height: 1,
    backgroundColor: colors.brass,
  },
  flourishLineSoft: {
    width: 64,
    height: 1,
    backgroundColor: colors.brassBright,
  },
  flourishGem: {
    width: 10,
    height: 10,
    backgroundColor: colors.brass,
  },
  tagline: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    maxWidth: 280,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[2],
  },
  cta: {
    backgroundColor: colors.mint,
  },
  statsBtn: {
    backgroundColor: colors.white,
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
    letterSpacing: 2,
    color: colors.brass,
    marginBottom: space[2],
  },
  card: {
    padding: space[4],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brassBright,
    borderLeftWidth: 3,
    borderLeftColor: colors.brass,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  cardGem: {
    width: 7,
    height: 7,
    backgroundColor: colors.brass,
    transform: [{ rotate: '45deg' }],
  },
  cardTitle: {
    fontFamily: type.brandSoft,
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
