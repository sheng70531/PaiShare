import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, radii, space, type } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  label: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space[4],
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  hint: {
    fontFamily: type.body,
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
});
