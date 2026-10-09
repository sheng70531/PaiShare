import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/ScreenWash';
import { formatSignedMoney } from '@/lib/settlement';
import { pokerSheet, summarizePoker } from '@/lib/poker-record';
import { useTripStore } from '@/storage/store';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

function netColor(amount: number): string {
  if (amount > 0) return colors.mint;
  if (amount < 0) return colors.coral;
  return colors.textMuted;
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const trips = useTripStore((s) => s.trips);
  const roster = useTripStore((s) => s.roster);
  const rows = summarizePoker(trips, roster);
  const sheet = pokerSheet(trips, roster);

  return (
    <ScreenWash>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space[6] },
          rows.length === 0 && styles.emptyWrap,
        ]}
      >
        {rows.length === 0 ? (
          <Text style={styles.empty}>還沒有打牌成績。</Text>
        ) : (
          <>
            <Text style={styles.section}>總表</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={styles.tr}>
                  <Text style={[styles.session, styles.th]}>場次</Text>
                  {sheet.people.map((person) => (
                    <Text key={person.personId} style={[styles.cell, styles.th]} numberOfLines={1}>
                      {person.name}
                    </Text>
                  ))}
                </View>
                {sheet.sessions.map((session) => (
                  <View key={session.id} style={styles.tr}>
                    <Text style={styles.session} numberOfLines={1}>
                      {session.label}
                    </Text>
                    {sheet.people.map((person) => {
                      const net = session.nets[person.personId];
                      const played = net !== undefined;
                      return (
                        <Text
                          key={person.personId}
                          style={[styles.cell, played ? { color: netColor(net) } : styles.miss]}
                        >
                          {played ? formatSignedMoney(net) : '—'}
                        </Text>
                      );
                    })}
                  </View>
                ))}
                <View style={[styles.tr, styles.totalRow]}>
                  <Text style={[styles.session, styles.totalLabel]}>總計</Text>
                  {sheet.people.map((person) => (
                    <Text
                      key={person.personId}
                      style={[styles.cell, styles.totalLabel, { color: netColor(person.net) }]}
                    >
                      {formatSignedMoney(person.net)}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>

            <Text style={styles.section}>總計</Text>
            {rows.map((item) => (
              <View key={item.personId} style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={[styles.net, { color: netColor(item.net) }]}>{formatSignedMoney(item.net)}</Text>
                </View>
                <Text style={styles.meta}>
                  {item.sessions} 場 · {item.wins} 勝 {item.losses} 負 {item.pushes} 平
                </Text>
                <Text style={styles.meta}>
                  最大贏 {formatSignedMoney(item.best)} · 最大輸 {formatSignedMoney(item.worst)}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: space[5],
    gap: space[3],
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    fontFamily: type.body,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: space[2],
  },
  table: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  totalRow: {
    borderBottomWidth: 0,
    backgroundColor: colors.overlay,
  },
  session: {
    width: 132,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  cell: {
    width: 84,
    paddingHorizontal: space[2],
    paddingVertical: space[3],
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'right',
  },
  th: {
    fontFamily: type.bodySemi,
    color: colors.textMuted,
  },
  miss: {
    color: colors.textFaint,
  },
  totalLabel: {
    fontFamily: type.bodyBold,
  },
  card: {
    padding: space[4],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space[1],
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
  },
  name: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.lg,
    color: colors.ink,
    flex: 1,
  },
  net: {
    fontFamily: type.bodyBold,
    fontSize: fontSize.lg,
  },
  meta: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
