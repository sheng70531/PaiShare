import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { ScreenWash } from '@/components/ScreenWash';
import { useTripStore } from '@/storage/store';
import { colors, fontSize, space, type } from '@/theme/tokens';

export default function NewTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createTrip = useTripStore((s) => s.createTrip);
  const [title, setTitle] = useState('');
  const [peopleText, setPeopleText] = useState('');

  const peoplePreview = useMemo(
    () =>
      peopleText
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [peopleText],
  );

  const onCreate = () => {
    if (peoplePreview.length < 2) {
      Alert.alert('至少兩人', '分帳至少需要兩位成員。');
      return;
    }
    const id = createTrip(title || `行程 ${new Date().toLocaleDateString('zh-TW')}`, peoplePreview);
    if (!id) {
      Alert.alert('至少兩人', '分帳至少需要兩位成員。');
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
        <Text style={styles.lead}>幫這趟行程取個名字，並加上同行的人。</Text>
        <Field
          label="行程名稱"
          placeholder="例如：7/17 聚餐"
          value={title}
          onChangeText={setTitle}
        />
        <Field
          label="成員"
          placeholder="小明, 小華, 阿強"
          value={peopleText}
          onChangeText={setPeopleText}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: 14 }}
          hint="用逗號或換行分隔。之後還能再加人。"
        />
        {peoplePreview.length > 0 ? (
          <Text style={styles.preview}>已辨識 {peoplePreview.length} 人：{peoplePreview.join('、')}</Text>
        ) : null}
        <Button label="開始記帳" onPress={onCreate} />
      </ScrollView>
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[5],
    gap: space[5],
  },
  lead: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 24,
  },
  preview: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.mint,
  },
});
