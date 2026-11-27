import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../theme/tokens';

const CORNER = 22;
const INSET = 14;
const THICK = 1.5;

type Props = ViewProps & {
  children: ReactNode;
};

export function ScreenWash({ children, style, ...rest }: Props) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      {children}
      <View style={styles.frame}>
        <View style={[styles.mark, styles.tl]} />
        <View style={[styles.mark, styles.tr]} />
        <View style={[styles.mark, styles.bl]} />
        <View style={[styles.mark, styles.br]} />
        <View style={[styles.markInner, styles.itl]} />
        <View style={[styles.markInner, styles.itr]} />
        <View style={[styles.markInner, styles.ibl]} />
        <View style={[styles.markInner, styles.ibr]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.brassBright,
    opacity: 0.28,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -110,
    left: -70,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.mintMuted,
    opacity: 0.4,
  },
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  mark: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.brass,
  },
  tl: { top: INSET, left: INSET, borderTopWidth: THICK, borderLeftWidth: THICK },
  tr: { top: INSET, right: INSET, borderTopWidth: THICK, borderRightWidth: THICK },
  bl: { bottom: INSET, left: INSET, borderBottomWidth: THICK, borderLeftWidth: THICK },
  br: { bottom: INSET, right: INSET, borderBottomWidth: THICK, borderRightWidth: THICK },
  markInner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: colors.brassBright,
  },
  itl: { top: INSET + 7, left: INSET + 7, borderTopWidth: 1, borderLeftWidth: 1 },
  itr: { top: INSET + 7, right: INSET + 7, borderTopWidth: 1, borderRightWidth: 1 },
  ibl: { bottom: INSET + 7, left: INSET + 7, borderBottomWidth: 1, borderLeftWidth: 1 },
  ibr: { bottom: INSET + 7, right: INSET + 7, borderBottomWidth: 1, borderRightWidth: 1 },
});
