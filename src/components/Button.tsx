import { forwardRef } from 'react';
import { StyleSheet, Text, type PressableProps, type TextStyle, type View, type ViewStyle } from 'react-native';
import { colors, fontSize, radii, space, type } from '../theme/tokens';
import { PressScale } from './PressScale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
  labelStyle?: TextStyle;
};

export const Button = forwardRef<View, Props>(function Button(
  { label, variant = 'primary', style, labelStyle, disabled, ...rest },
  ref,
) {
  return (
    <PressScale
      ref={ref}
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      {...rest}
    >
      <Text style={[styles.label, styles[`${variant}Label`], labelStyle]}>{label}</Text>
    </PressScale>
  );
});

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: space[5],
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.brassBright,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brass,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.coral },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    letterSpacing: 0.6,
  },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.brass },
  ghostLabel: { color: colors.mint, fontFamily: type.bodyMed },
  dangerLabel: { color: colors.white },
});
