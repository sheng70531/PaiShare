import { forwardRef, useEffect } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 16, stiffness: 380 };

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export const PressScale = forwardRef<View, Props>(function PressScale(
  { style, disabled, pressedScale = 0.96, onPressIn, onPressOut, children, ...rest },
  ref,
) {
  const scale = useSharedValue(1);
  const reduce = useSharedValue(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) reduce.value = on;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      reduce.value = on;
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [reduce]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled && !reduce.value) scale.value = withSpring(pressedScale, SPRING);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(event);
      }}
      style={[anim, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
