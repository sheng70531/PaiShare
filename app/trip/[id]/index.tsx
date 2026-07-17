import { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ExpenseRow } from '@/components/ExpenseRow';
import { ScreenWash } from '@/components/ScreenWash';
import { showAlert } from '@/lib/alert';
import { impactOfRemovingPerson } from '@/lib/remove-person';
import { useTripStore } from '@/storage/store';
import type { Expense, Person } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const addPerson = useTripStore((s) => s.addPerson);
  const removePerson = useTripStore((s) => s.removePerson);
  const updateTripTitle = useTripStore((s) => s.updateTripTitle);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [newName, setNewName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const peopleById = useMemo(() => {
    const map: Record<string, Person> = {};
    trip?.people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [trip?.people]);

  if (!trip) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>找不到這趟行程</Text>
        <Button label="回首頁" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const onAddPerson = () => {
    if (!newName.trim()) return;
    addPerson(trip.id, newName);
    setNewName('');
  };

  const onStartRename = () => {
    setTitleDraft(trip.title);
    setEditingTitle(true);
  };

  const onCancelRename = () => {
    setTitleDraft(trip.title);
    setEditingTitle(false);
  };

  const onSaveTitle = () => {
    updateTripTitle(trip.id, titleDraft);
    setEditingTitle(false);
  };

  const onExport = async () => {
    try {
      await Share.share({
        title: `PaiShare-${trip.title}`,
        message: JSON.stringify(trip, null, 2),
      });
    } catch {
      showAlert('匯出失敗', '無法開啟分享選單，請稍後再試。');
    }
  };

  const onRemovePerson = (p: Person) => {
    if (trip.people.length <= 2) {
      showAlert('無法移除', '分帳至少需要兩位成員。');
      return;
    }
    const { deleted, trimmed } = impactOfRemovingPerson(trip.expenses, p.id);
    const parts: string[] = [];
    if (deleted > 0) parts.push(`刪除 ${deleted} 筆支出`);
    if (trimmed > 0) parts.push(`從 ${trimmed} 筆分攤名單移除`);
    const detail =
      parts.length > 0 ? `將會：${parts.join('、')}。` : '沒有相關支出。';
    showAlert('移除成員', `移除 ${p.name}？${detail}`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: () => removePerson(trip.id, p.id),
      },
    ]);
  };

  const onDeleteTrip = () => {
    showAlert('刪除行程', '確定刪除？支出紀錄會一併清除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          const tripId = trip.id;
          router.replace('/');
          deleteTrip(tripId);
        },
      },
    ]);
  };

  return (
    <ScreenWash>
      <Stack.Screen options={{ title: trip.title }} />
      <FlatList
        data={trip.expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            {editingTitle ? (
              <View style={styles.renameBlock}>
                <TextInput
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  style={styles.renameInput}
                  autoFocus
                  onSubmitEditing={onSaveTitle}
                />
                <View style={styles.renameActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onCancelRename}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>取消</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onSaveTitle}
                    style={styles.addBtn}
                  >
                    <Text style={styles.addBtnText}>儲存</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重新命名行程"
                onPress={onStartRename}
              >
                <Text style={styles.renameHint}>重新命名</Text>
              </Pressable>
            )}

            <View style={styles.peopleBlock}>
              <Text style={styles.section}>成員</Text>
              <View style={styles.peopleRow}>
                {trip.people.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityHint="長按可移除成員"
                    onLongPress={() => onRemovePerson(p)}
                    style={styles.personChip}
                  >
                    <Text style={styles.personText}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.addPersonRow}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="加人"
                  placeholderTextColor={colors.textFaint}
                  style={styles.addInput}
                  onSubmitEditing={onAddPerson}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={onAddPerson}
                  style={styles.addBtn}
                >
                  <Text style={styles.addBtnText}>加入</Text>
                </Pressable>
              </View>
              <Text style={styles.hint}>
                {trip.people.length <= 2
                  ? '至少兩人；加人後才可長按移除'
                  : '長按成員可移除'}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                label="記一筆"
                onPress={() => router.push(`/trip/${trip.id}/expense`)}
                style={{ flex: 1, backgroundColor: colors.mint }}
              />
              <Button
                label="結算"
                variant="secondary"
                onPress={() => router.push(`/trip/${trip.id}/settle`)}
                style={{ flex: 1 }}
              />
            </View>

            <Text style={styles.section}>支出</Text>
            {trip.expenses.length === 0 ? (
              <Text style={styles.empty}>還沒有支出。均可記均攤或一對一特殊支出。</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }: { item: Expense }) => (
          <ExpenseRow
            expense={item}
            peopleById={peopleById}
            onPress={() =>
              router.push(`/trip/${trip.id}/expense?expenseId=${item.id}`)
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onExport}
              style={styles.exportLink}
            >
              <Text style={styles.exportText}>匯出 JSON 備份</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onDeleteTrip}
              style={styles.deleteLink}
            >
              <Text style={styles.deleteText}>刪除行程</Text>
            </Pressable>
          </View>
        }
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  header: { gap: space[4], marginBottom: space[3] },
  renameBlock: { gap: space[2] },
  renameActions: { flexDirection: 'row', gap: space[2], justifyContent: 'flex-end' },
  renameInput: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space[3],
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  renameHint: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.mint,
  },
  cancelBtn: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  cancelBtnText: {
    fontFamily: type.bodyMed,
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  peopleBlock: { gap: space[2] },
  section: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  peopleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  personChip: {
    minHeight: 40,
    paddingHorizontal: space[3],
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    justifyContent: 'center',
  },
  personText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  addPersonRow: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  addInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space[3],
    fontFamily: type.body,
    color: colors.ink,
  },
  addBtn: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  addBtnText: {
    fontFamily: type.bodySemi,
    color: colors.white,
    fontSize: fontSize.sm,
  },
  hint: {
    fontFamily: type.body,
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
  actions: { flexDirection: 'row', gap: space[3] },
  empty: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  footer: { alignItems: 'center', paddingVertical: space[6], gap: space[4] },
  exportLink: { paddingVertical: space[1] },
  exportText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.mint,
  },
  deleteLink: { paddingVertical: space[1] },
  deleteText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.coral,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.paper,
  },
  missingText: {
    fontFamily: type.body,
    color: colors.textMuted,
  },
});
