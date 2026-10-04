import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PersonPicker } from '@/components/PersonPicker';
import { ScreenWash } from '@/components/ScreenWash';
import { showAlert } from '@/lib/alert';
import { useTripStore } from '@/storage/store';
import { colors, fontSize, space, type } from '@/theme/tokens';

export default function NewTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const roster = useTripStore((s) => s.roster);
  const addClassmate = useTripStore((s) => s.addClassmate);
  const renamePerson = useTripStore((s) => s.renamePerson);
  const createTrip = useTripStore((s) => s.createTrip);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onAddClassmate = () => {
    const id = addClassmate(newName);
    if (!id) {
      showAlert('請輸入名字', '新增同學需要一個名字。');
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setNewName('');
  };

  const onStartRename = (id: string) => {
    const person = useTripStore.getState().roster.find((p) => p.id === id);
    setRenameId(id);
    setRenameText(person?.name ?? '');
  };

  const onRename = () => {
    if (!renameId) return;
    if (!renamePerson(renameId, renameText)) {
      showAlert('無法改名', '名字是空的，或名單裡已經有這個人。');
      return;
    }
    setRenameId(null);
  };

  const onCreate = () => {
    if (selected.length < 2) {
      showAlert('至少兩人', '這一趟至少勾選兩位同學。');
      return;
    }
    const id = createTrip(title || `行程 ${new Date().toLocaleDateString('zh-TW')}`, selected);
    if (!id) {
      showAlert('至少兩人', '這一趟至少勾選兩位同學。');
      return;
    }
    router.replace(`/trip/${id}`);
  };

  return (
    <ScreenWash>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>幫這趟行程取個名字，並勾選這次有來的同學。</Text>
        <Field
          label="行程名稱"
          placeholder="例如：7/17 聚餐"
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.label}>這次有來</Text>
        {roster.length === 0 ? (
          <Text style={styles.hint}>名單還沒有人。先在下面輸入同學的名字。</Text>
        ) : (
          <PersonPicker
            people={roster}
            selectedIds={selected}
            onToggle={toggle}
            onLongPress={onStartRename}
          />
        )}
        {roster.length > 0 ? (
          <Text style={styles.hint}>長按名字可改名，所有行程會一起改。已勾選 {selected.length} 人。</Text>
        ) : null}
        {renameId ? (
          <View style={styles.rename}>
            <Field label="改名" value={renameText} onChangeText={setRenameText} />
            <Button label="儲存名字" variant="secondary" onPress={onRename} />
          </View>
        ) : null}
        <Field
          label="新增同學"
          placeholder="名字"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={onAddClassmate}
          hint="同名會直接勾選名單上的那個人。"
        />
        <Button label="加入名單" variant="secondary" onPress={onAddClassmate} />
        <Button label="開始記帳" onPress={onCreate} />
      </ScrollView>
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[5],
    gap: space[4],
  },
  lead: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 24,
  },
  label: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  hint: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  rename: { gap: space[3] },
});
