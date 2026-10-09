import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PersonPicker } from '@/components/PersonPicker';
import { ScreenWash } from '@/components/ScreenWash';
import { showAlert } from '@/lib/alert';
import {
  balancingNetCents,
  formatNetDraft,
  formatSignedMoney,
  ledgerLineNetCents,
  netCentsToLedgerLine,
  parseNetDraft,
} from '@/lib/settlement';
import { useTripStore } from '@/storage/store';
import type { Person } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

type Mode = 'split' | 'transfer' | 'ledger';

export default function ExpenseFormScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const roster = useTripStore((s) => s.roster);
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
    existing && existing.type !== 'ledger' ? String(existing.amount) : '',
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
  const [ledger, setLedger] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (existing?.type === 'ledger') {
      for (const line of existing.lines) {
        init[line.personId] = formatNetDraft(ledgerLineNetCents(line));
      }
    }
    return init;
  });

  const ledgerPeople = useMemo(() => {
    if (!trip) return [] as Person[];
    const extraIds =
      existing?.type === 'ledger'
        ? existing.lines
            .map((l) => l.personId)
            .filter((pid) => !trip.people.some((p) => p.id === pid))
        : [];
    const extras = extraIds.map(
      (pid) => roster.find((p) => p.id === pid) ?? { id: pid, name: '?' },
    );
    return [...trip.people, ...extras];
  }, [trip, existing, roster]);

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

  const setNet = (pid: string, text: string) => {
    setLedger((prev) => ({ ...prev, [pid]: text }));
  };

  const ledgerPreview = (() => {
    const drafts = ledgerPeople.map((person) => ({
      person,
      draft: parseNetDraft(ledger[person.id] ?? ''),
    }));
    const blocked = drafts.some((row) => row.draft.kind === 'invalid' || row.draft.kind === 'partial');
    const balance = blocked
      ? null
      : balancingNetCents(
          drafts.map((row) => ({
            id: row.person.id,
            cents: row.draft.kind === 'value' ? row.draft.cents : null,
          })),
        );
    const lines = drafts.flatMap((row) => {
      if (balance && row.person.id === balance.id) {
        return [netCentsToLedgerLine(row.person.id, balance.cents)];
      }
      if (row.draft.kind !== 'value') return [];
      return [netCentsToLedgerLine(row.person.id, row.draft.cents)];
    });
    const sumCents = lines.reduce((sum, line) => sum + ledgerLineNetCents(line), 0);
    return {
      drafts,
      blocked,
      balance,
      lines,
      sumCents,
      nonzero: lines.filter((line) => ledgerLineNetCents(line) !== 0).length,
    };
  })();

  const saveLedger = () => {
    if (!title.trim()) {
      showAlert('請填項目', '例如：晚上第一場');
      return;
    }
    if (ledgerPreview.blocked) {
      showAlert('金額無效', '淨額請填數字，贏填正的、輸填負的。');
      return;
    }
    if (ledgerPreview.lines.length < 2) {
      showAlert('人數不足', '至少兩人上場。沒打的人留空。');
      return;
    }
    if (ledgerPreview.sumCents !== 0) {
      showAlert('還沒平', `還差 ${formatSignedMoney(-ledgerPreview.sumCents / 100)}。再填一個人就會自動補上。`);
      return;
    }
    if (ledgerPreview.nonzero < 1) {
      showAlert('這場沒有輸贏', '至少要有一個人的淨額不是 0。');
      return;
    }
    const payload = {
      type: 'ledger' as const,
      title: title.trim(),
      lines: ledgerPreview.lines,
    };
    if (existing) {
      updateExpense(trip.id, { ...payload, id: existing.id, createdAt: existing.createdAt });
    } else {
      addExpense(trip.id, payload);
    }
    router.back();
  };

  const onSave = () => {
    if (mode === 'ledger') {
      saveLedger();
      return;
    }
    const raw = Number(amountText.replace(/,/g, ''));
    if (!title.trim()) {
      showAlert('請填項目', '例如：午餐、飲料');
      return;
    }
    if (!Number.isFinite(raw) || raw <= 0) {
      showAlert('金額無效', '請輸入大於 0 的數字');
      return;
    }
    const amount = Math.round(raw * 100) / 100;

    if (mode === 'split') {
      if (!paidById || participantIds.length === 0) {
        showAlert('分攤不完整', '請選擇墊付人與至少一位分攤人');
        return;
      }
      const payload = {
        type: 'split' as const,
        title: title.trim(),
        amount,
        paidById,
        participantIds,
      };
      if (existing) {
        updateExpense(trip.id, { ...payload, id: existing.id, createdAt: existing.createdAt });
      } else {
        addExpense(trip.id, payload);
      }
    } else {
      if (!fromId || !toId || fromId === toId) {
        showAlert('一對一無效', '請選擇不同的付款人與收款人');
        return;
      }
      const payload = {
        type: 'transfer' as const,
        title: title.trim(),
        amount,
        fromId,
        toId,
      };
      if (existing) {
        updateExpense(trip.id, { ...payload, id: existing.id, createdAt: existing.createdAt });
      } else {
        addExpense(trip.id, payload);
      }
    }
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    showAlert('刪除支出', '確定刪除這筆？', [
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

  const hint =
    mode === 'split'
      ? '餐費、飲料、檯費：誰墊、誰分攤'
      : mode === 'transfer'
        ? '代買個人物品：誰應付給誰'
        : '每人填這一場的淨額。只剩一個人沒填時會自動補平。沒打的人留空；打平請填 0';

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
          {(
            [
              ['split', '均攤'],
              ['transfer', '一對一'],
              ['ledger', '成績'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === key }}
              onPress={() => setMode(key)}
              style={[styles.modeBtn, mode === key && styles.modeOn]}
            >
              <Text style={[styles.modeText, mode === key && styles.modeTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.modeHint}>{hint}</Text>

        <Field label="項目" placeholder="午餐 / 第一場 / 飲料" value={title} onChangeText={setTitle} />

        {mode === 'ledger' ? (
          <>
            <Text style={styles.tally}>
              {ledgerPreview.blocked
                ? '有一格還沒填好'
                : ledgerPreview.balance
                  ? `已補 ${ledgerPeople.find((p) => p.id === ledgerPreview.balance?.id)?.name ?? ''} ${formatSignedMoney(ledgerPreview.balance.cents / 100)}`
                  : ledgerPreview.sumCents === 0 && ledgerPreview.lines.length > 0
                    ? '已平'
                    : ledgerPreview.lines.length > 0
                      ? `還差 ${formatSignedMoney(-ledgerPreview.sumCents / 100)}`
                      : '填淨額'}
            </Text>
            {ledgerPreview.drafts.map(({ person, draft }) => {
              const isAuto = ledgerPreview.balance?.id === person.id;
              const cents = isAuto
                ? ledgerPreview.balance?.cents
                : draft.kind === 'value'
                  ? draft.cents
                  : null;
              const shown = isAuto && ledgerPreview.balance
                ? formatNetDraft(ledgerPreview.balance.cents)
                : (ledger[person.id] ?? '');
              return (
                <View key={person.id} style={styles.ledgerCard}>
                  <View style={styles.ledgerHead}>
                    <Text style={styles.ledgerName}>{person.name}</Text>
                    <Text style={styles.ledgerNet}>
                      {cents === null || cents === undefined ? '—' : formatSignedMoney(cents / 100)}
                    </Text>
                    {isAuto ? <Text style={styles.autoTag}>自動</Text> : null}
                  </View>
                  <TextInput
                    value={shown}
                    onChangeText={(text) => setNet(person.id, text)}
                    placeholder="淨額"
                    placeholderTextColor={colors.textFaint}
                    keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                    accessibilityLabel={`${person.name} 淨額`}
                    style={[styles.ledgerInput, isAuto && styles.ledgerInputAuto]}
                  />
                </View>
              );
            })}
          </>
        ) : (
          <Field
            label="金額"
            placeholder="0"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
          />
        )}

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
        ) : null}

        {mode === 'transfer' ? (
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
        ) : null}

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
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  modeTextOn: { color: colors.ink, fontFamily: type.bodySemi },
  modeHint: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -space[2],
    lineHeight: 20,
  },
  tally: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  ledgerCard: {
    gap: space[2],
    padding: space[3],
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ledgerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[2],
  },
  ledgerName: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
  },
  ledgerNet: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  autoTag: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.xs,
    color: colors.mint,
  },
  ledgerInput: {
    minHeight: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space[3],
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  ledgerInputAuto: {
    borderColor: colors.mint,
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
