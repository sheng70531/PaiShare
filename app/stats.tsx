import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/ScreenWash';
import { formatSignedMoney } from '@/lib/settlement';
import { summarizePoker } from '@/lib/poker-record';
import { useTripStore } from '@/storage/store';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const trips = useTripStore((s) => s.trips);
  const roster = useTripStore((s) => s.roster);
  const rows = summarizePoker(trips, roster);

  return (
    <ScreenWash>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.personId}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space[6] },
          rows.length === 0 && styles.emptyWrap,
        ]}
        ListEmptyComponent={<Text style={styles.empty}>還沒有打牌成績。</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.net}>{formatSignedMoney(item.net)}</Text>
            </View>
            <Text style={styles.meta}>
              {item.sessions} 場 · {item.wins} 勝 {item.losses} 負 {item.pushes} 平
            </Text>
            <Text style={styles.meta}>
              最大贏 {formatSignedMoney(item.best)} · 最大輸 {formatSignedMoney(item.worst)}
            </Text>
          </View>
        )}
      />
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: space[5],
    gap: space[3],
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    padding: space[4],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space[1],
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
  },
  name: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.lg,
    color: colors.ink,
    flex: 1,
  },
  net: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  meta: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
