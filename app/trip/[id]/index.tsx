import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
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
import { useTripStore } from '@/storage/store';
import type { Expense, Person } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const addPerson = useTripStore((s) => s.addPerson);
  const removePerson = useTripStore((s) => s.removePerson);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [newName, setNewName] = useState('');

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

  const onDeleteTrip = () => {
    Alert.alert('刪除行程', '確定刪除？支出紀錄會一併清除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          deleteTrip(trip.id);
          router.replace('/');
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
            <View style={styles.peopleBlock}>
              <Text style={styles.section}>成員</Text>
              <View style={styles.peopleRow}>
                {trip.people.map((p) => (
                  <Pressable
                    key={p.id}
                    onLongPress={() => {
                      Alert.alert('移除成員', `移除 ${p.name}？相關支出也會刪除。`, [
                        { text: '取消', style: 'cancel' },
                        {
                          text: '移除',
                          style: 'destructive',
                          onPress: () => removePerson(trip.id, p.id),
                        },
                      ]);
                    }}
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
                <Pressable onPress={onAddPerson} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>加入</Text>
                </Pressable>
              </View>
              <Text style={styles.hint}>長按成員可移除</Text>
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
          <Pressable onPress={onDeleteTrip} style={styles.deleteLink}>
            <Text style={styles.deleteText}>刪除行程</Text>
          </Pressable>
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
  deleteLink: { alignItems: 'center', paddingVertical: space[6] },
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
