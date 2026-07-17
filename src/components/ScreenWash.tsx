import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../theme/tokens';

type Props = ViewProps & {
  children: React.ReactNode;
};

export function ScreenWash({ children, style, ...rest }: Props) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      {children}
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
    top: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.mintMuted,
    opacity: 0.45,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.paperDeep,
    opacity: 0.7,
  },
});
