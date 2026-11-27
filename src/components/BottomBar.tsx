import { useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fontSize, space, type } from '../theme/tokens';
import { keyboardLift } from '../lib/keyboard-lift';

type Item = { href: Href; label: string; on: boolean };

function itemsFor(path: string): Item[] {
  const match = path.match(/^\/trip\/([^/]+)/);
  const id = match && match[1] !== 'new' ? match[1] : null;
  if (!id) {
    return [
      { href: '/', label: '首頁', on: path === '/' },
      { href: '/stats', label: '戰績', on: path === '/stats' },
      { href: '/trip/new', label: '新行程', on: path === '/trip/new' },
    ];
  }
  const base = `/trip/${id}`;
  return [
    { href: '/', label: '首頁', on: false },
    { href: base as Href, label: '行程', on: path === base },
    { href: `${base}/expense` as Href, label: '記帳', on: path.startsWith(`${base}/expense`) },
    { href: `${base}/settle` as Href, label: '結算', on: path.startsWith(`${base}/settle`) },
    { href: `${base}/winds` as Href, label: '風位', on: path.startsWith(`${base}/winds`) },
  ];
}

export function BottomBar() {
  const path = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lift = useSharedValue(0);
  const keyboardTop = useRef<number | null>(null);
  const restingPad = Math.max(insets.bottom, space[2]);

  useEffect(() => {
    const apply = (next: number, duration?: number) => {
      lift.value = duration ? withTiming(next, { duration }) : next;
    };

    if (Platform.OS === 'web') {
      const vv = window.visualViewport;
      if (!vv) return;
      const update = () => {
        apply(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
      };
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sync = (duration?: number) => {
      apply(keyboardLift(Dimensions.get('window').height, keyboardTop.current), duration);
    };
    const show = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      sync(Platform.OS === 'ios' ? event.duration : undefined);
    });
    const hide = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => {
      keyboardTop.current = null;
      sync(Platform.OS === 'ios' ? event.duration : undefined);
    });
    const dims = Dimensions.addEventListener('change', () => sync());
    return () => {
      show.remove();
      hide.remove();
      dims.remove();
    };
  }, [lift]);

  const anim = useAnimatedStyle(() => ({
    marginBottom: lift.value,
    paddingBottom: lift.value > 0 ? space[2] : restingPad,
  }));

  const items = itemsFor(path);

  return (
    <Animated.View accessibilityRole="tablist" style={[styles.bar, anim]}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.on }}
          aria-selected={item.on}
          onPress={() => {
            if (!item.on) router.navigate(item.href);
          }}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <View style={styles.gemSlot}>{item.on ? <View style={styles.gem} /> : null}</View>
          <Text style={[styles.label, item.on && styles.labelOn]}>{item.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.brassBright,
    paddingTop: space[2],
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { opacity: 0.55 },
  gemSlot: {
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gem: {
    width: 6,
    height: 6,
    backgroundColor: colors.brass,
    transform: [{ rotate: '45deg' }],
  },
  label: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  labelOn: {
    fontFamily: type.bodySemi,
    color: colors.brass,
  },
});
