import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Expense, Person } from '../models/types';
import { formatMoney } from '../lib/settlement';
import { colors, fontSize, radii, space, type } from '../theme/tokens';

type Props = {
  expense: Expense;
  peopleById: Record<string, Person>;
  onPress: () => void;
};

export function ExpenseRow({ expense, peopleById, onPress }: Props) {
  const name = (id: string) => peopleById[id]?.name ?? '?';
  const isTransfer = expense.type === 'transfer';
  const subtitle = isTransfer
    ? `${name(expense.fromId)} → ${name(expense.toId)}`
    : `${name(expense.paidById)} 墊付 · ${expense.participantIds.length} 人分攤`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={[styles.badge, isTransfer ? styles.badgeTransfer : styles.badgeSplit]}>
          <Text style={styles.badgeText}>{isTransfer ? '一對一' : '均攤'}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {expense.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.amount}>{formatMoney(expense.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[4],
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.9 },
  left: { flex: 1, gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeSplit: { backgroundColor: colors.mist },
  badgeTransfer: { backgroundColor: 'rgba(214, 90, 74, 0.12)' },
  badgeText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
  },
  title: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  sub: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  amount: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
});
