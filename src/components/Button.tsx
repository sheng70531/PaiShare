import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fontSize, radii, space, type } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
  labelStyle?: TextStyle;
};

export function Button({
  label,
  variant = 'primary',
  style,
  labelStyle,
  disabled,
  ...rest
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, styles[`${variant}Label`], labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space[5],
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.ink },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.coral },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
  },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.ink },
  ghostLabel: { color: colors.mint, fontFamily: type.bodyMed },
  dangerLabel: { color: colors.white },
});
