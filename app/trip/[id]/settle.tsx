import { useEffect, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ScreenWash } from '@/components/ScreenWash';
import { formatMoney, settleTrip } from '@/lib/settlement';
import { useTripStore } from '@/storage/store';
import type { TransferSuggestion } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

function marksMatchTransfers(
  marks: { fromId: string; toId: string; amount: number; paid: boolean }[],
  next: { fromId: string; toId: string; amount: number; paid: boolean }[],
): boolean {
  if (marks.length !== next.length) return false;
  return next.every(
    (n, i) =>
      n.fromId === marks[i]?.fromId &&
      n.toId === marks[i]?.toId &&
      Math.round(n.amount * 100) === Math.round((marks[i]?.amount ?? 0) * 100) &&
      n.paid === marks[i]?.paid,
  );
}

export default function SettleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const setSettlementMarks = useTripStore((s) => s.setSettlementMarks);
  const toggleSettlementPaid = useTripStore((s) => s.toggleSettlementPaid);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // depend on people/expenses refs only — toggling paid must not recompute
  const transfers = useMemo(() => {
    if (!trip) return [] as TransferSuggestion[];
    return settleTrip(
      trip.people.map((p) => p.id),
      trip.expenses,
    );
  }, [trip?.people, trip?.expenses]);

  const nameOf = (pid: string) => trip?.people.find((p) => p.id === pid)?.name ?? '?';

  const isPaid = (t: TransferSuggestion) =>
    trip?.settlementMarks.some(
      (m) =>
        m.paid &&
        m.fromId === t.fromId &&
        m.toId === t.toId &&
        Math.round(m.amount * 100) === Math.round(t.amount * 100),
    ) ?? false;

  useEffect(() => {
    if (!id) return;
    const current = useTripStore.getState().getTrip(id);
    if (!current) return;
    const next = transfers.map((t) => {
      const prev = current.settlementMarks.find(
        (m) =>
          m.fromId === t.fromId &&
          m.toId === t.toId &&
          Math.round(m.amount * 100) === Math.round(t.amount * 100),
      );
      return {
        fromId: t.fromId,
        toId: t.toId,
        amount: t.amount,
        paid: prev?.paid ?? false,
      };
    });
    if (!marksMatchTransfers(current.settlementMarks, next)) {
      setSettlementMarks(id, next);
    }
  }, [id, transfers, setSettlementMarks]);

  if (!trip) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>找不到行程</Text>
        <Button label="回首頁" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <ScreenWash>
      <FlatList
        data={transfers}
        keyExtractor={(t) => `${t.fromId}-${t.toId}-${t.amount}`}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space[6] },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.brandLine}>誰給誰多少</Text>
            <Text style={styles.lead}>
              已把均攤與一對一債權沖銷成最少筆轉帳。點一下可標記已付清。
            </Text>
            {transfers.length === 0 ? (
              <View style={styles.zeroBox}>
                <Text style={styles.zeroTitle}>帳已平</Text>
                <Text style={styles.zeroSub}>目前沒有人需要轉帳。</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const paid = isPaid(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ checked: paid }}
              onPress={() =>
                toggleSettlementPaid(trip.id, item.fromId, item.toId, item.amount)
              }
              style={[styles.row, paid && styles.rowPaid]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.transfer, paid && styles.paidText]}>
                  {nameOf(item.fromId)}
                  <Text style={styles.arrow}> → </Text>
                  {nameOf(item.toId)}
                </Text>
                <Text style={styles.mark}>{paid ? '已付清' : '點擊標記付清'}</Text>
              </View>
              <Text style={[styles.amount, paid && styles.paidText]}>
                {formatMoney(item.amount)}
              </Text>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
      />
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  list: { padding: space[5], gap: space[3] },
  header: { gap: space[3], marginBottom: space[3] },
  brandLine: {
    fontFamily: type.brandSoft,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  lead: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 22,
  },
  zeroBox: {
    marginTop: space[4],
    padding: space[5],
    borderRadius: radii.lg,
    backgroundColor: colors.mist,
    gap: space[2],
  },
  zeroTitle: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.lg,
    color: colors.mint,
  },
  zeroSub: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[4],
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    gap: space[3],
  },
  rowPaid: {
    borderColor: colors.mint,
    backgroundColor: 'rgba(31, 138, 122, 0.08)',
  },
  rowText: { flex: 1, gap: 4 },
  transfer: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  arrow: { color: colors.mint, fontFamily: type.bodyBold },
  mark: {
    fontFamily: type.body,
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
  amount: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  paidText: { color: colors.mint },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.paper,
  },
  missingText: { fontFamily: type.body, color: colors.textMuted },
});
