import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Person } from '../models/types';
import { colors, fontSize, radii, space, type } from '../theme/tokens';

type Props = {
  people: Person[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
};

export function PersonPicker({ people, selectedIds, onToggle, multi = true }: Props) {
  return (
    <View style={styles.row}>
      {people.map((p) => {
        const on = selectedIds.includes(p.id);
        return (
          <Pressable
            key={p.id}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(p.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  chipTextOn: {
    color: colors.white,
  },
});
