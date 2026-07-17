import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PersonPicker } from '@/components/PersonPicker';
import { ScreenWash } from '@/components/ScreenWash';
import { useTripStore } from '@/storage/store';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

type Mode = 'split' | 'transfer';

export default function ExpenseFormScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const addExpense = useTripStore((s) => s.addExpense);
  const updateExpense = useTripStore((s) => s.updateExpense);
  const deleteExpense = useTripStore((s) => s.deleteExpense);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useMemo(
    () => trip?.expenses.find((e) => e.id === expenseId),
    [trip, expenseId],
  );

  const [mode, setMode] = useState<Mode>(existing?.type ?? 'split');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [amountText, setAmountText] = useState(
    existing ? String(existing.amount) : '',
  );
  const [paidById, setPaidById] = useState(
    existing?.type === 'split'
      ? existing.paidById
      : trip?.people[0]?.id ?? '',
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    existing?.type === 'split'
      ? existing.participantIds
      : trip?.people.map((p) => p.id) ?? [],
  );
  const [fromId, setFromId] = useState(
    existing?.type === 'transfer'
      ? existing.fromId
      : trip?.people[0]?.id ?? '',
  );
  const [toId, setToId] = useState(
    existing?.type === 'transfer'
      ? existing.toId
      : trip?.people[1]?.id ?? trip?.people[0]?.id ?? '',
  );

  if (!trip) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>找不到行程</Text>
      </View>
    );
  }

  const toggleParticipant = (pid: string) => {
    setParticipantIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  };

  const onSave = () => {
    const raw = Number(amountText.replace(/,/g, ''));
    if (!title.trim()) {
      Alert.alert('請填項目', '例如：午餐、飲料、打牌');
      return;
    }
    if (!Number.isFinite(raw) || raw <= 0) {
      Alert.alert('金額無效', '請輸入大於 0 的數字');
      return;
    }
    const amount = Math.round(raw * 100) / 100;

    if (mode === 'split') {
      if (!paidById || participantIds.length === 0) {
        Alert.alert('分攤不完整', '請選擇墊付人與至少一位分攤人');
        return;
      }
      if (existing) {
        updateExpense(trip.id, {
          id: existing.id,
          createdAt: existing.createdAt,
          type: 'split',
          title: title.trim(),
          amount,
          paidById,
          participantIds,
        });
      } else {
        addExpense(trip.id, {
          type: 'split',
          title: title.trim(),
          amount,
          paidById,
          participantIds,
        });
      }
    } else {
      if (!fromId || !toId || fromId === toId) {
        Alert.alert('一對一無效', '請選擇不同的付款人與收款人');
        return;
      }
      if (existing) {
        updateExpense(trip.id, {
          id: existing.id,
          createdAt: existing.createdAt,
          type: 'transfer',
          title: title.trim(),
          amount,
          fromId,
          toId,
        });
      } else {
        addExpense(trip.id, {
          type: 'transfer',
          title: title.trim(),
          amount,
          fromId,
          toId,
        });
      }
    }
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('刪除支出', '確定刪除這筆？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          deleteExpense(trip.id, existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScreenWash>
      <Stack.Screen options={{ title: existing ? '編輯支出' : '記一筆' }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.modeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'split' }}
            onPress={() => setMode('split')}
            style={[styles.modeBtn, mode === 'split' && styles.modeOn]}
          >
            <Text style={[styles.modeText, mode === 'split' && styles.modeTextOn]}>
              均攤
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'transfer' }}
            onPress={() => setMode('transfer')}
            style={[styles.modeBtn, mode === 'transfer' && styles.modeOn]}
          >
            <Text style={[styles.modeText, mode === 'transfer' && styles.modeTextOn]}>
              一對一
            </Text>
          </Pressable>
        </View>

        <Text style={styles.modeHint}>
          {mode === 'split'
            ? '餐費、飲料、檯費：誰墊、誰分攤'
            : '打牌輸贏、代買個人物品：誰應付給誰'}
        </Text>

        <Field label="項目" placeholder="午餐 / 打牌 / 飲料" value={title} onChangeText={setTitle} />
        <Field
          label="金額"
          placeholder="0"
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
        />

        {mode === 'split' ? (
          <>
            <Text style={styles.label}>誰墊付</Text>
            <PersonPicker
              people={trip.people}
              selectedIds={paidById ? [paidById] : []}
              multi={false}
              onToggle={(pid) => setPaidById(pid)}
            />
            <Text style={styles.label}>誰分攤</Text>
            <PersonPicker
              people={trip.people}
              selectedIds={participantIds}
              onToggle={toggleParticipant}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>誰該付</Text>
            <PersonPicker
              people={trip.people}
              selectedIds={fromId ? [fromId] : []}
              multi={false}
              onToggle={(pid) => setFromId(pid)}
            />
            <Text style={styles.label}>誰該收</Text>
            <PersonPicker
              people={trip.people}
              selectedIds={toId ? [toId] : []}
              multi={false}
              onToggle={(pid) => setToId(pid)}
            />
          </>
        )}

        <Button label={existing ? '儲存' : '加入'} onPress={onSave} />
        {existing ? (
          <Button label="刪除這筆" variant="ghost" onPress={onDelete} labelStyle={{ color: colors.coral }} />
        ) : null}
      </ScrollView>
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[5], gap: space[4] },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  modeOn: { backgroundColor: colors.white },
  modeText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  modeTextOn: { color: colors.ink, fontFamily: type.bodySemi },
  modeHint: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -space[2],
  },
  label: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: -space[2],
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  missingText: { fontFamily: type.body, color: colors.textMuted },
});
