import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PersonPicker } from '@/components/PersonPicker';
import { ScreenWash } from '@/components/ScreenWash';
import { showAlert } from '@/lib/alert';
import {
  SEAT_ROLES,
  chairWind,
  sameSeatOrder,
  shuffleWinds,
  startSeatIndex,
  windCycle,
} from '@/lib/wind-seats';
import { useTripStore } from '@/storage/store';
import { WINDS, type Wind, type WindDraw, type WindSeat } from '@/models/types';
import { colors, fontSize, radii, space, type } from '@/theme/tokens';

const NAME_W = 76;
const TILE_W = 52;
const TILE_H = 52;
const DIE = 32;
const DIE_GAP = 4;
const DICE_H = DIE * 3 + DIE_GAP * 2;
const CENTER = DIE;
const GAP = 8;
const ROW_H = Math.max(NAME_W, DICE_H);
const FACE_H = 48;
const CROSS_W = NAME_W + GAP + TILE_W + GAP + CENTER + GAP + TILE_W + GAP + NAME_W;
const CROSS_H = FACE_H + GAP + TILE_H + GAP + ROW_H + GAP + TILE_H + GAP + FACE_H;
const nativeDriver = Platform.OS !== 'web';

/** 抓牌用的十字：中間是骰子加 2×2 牌疊，四邊空位等翻到的牌飛過去。 */
const R_NAME = 56;
const R_TILE = 46;
const R_GAP = 4;
const PILE_GAP = 4;
const R_DIE = 28;
const PILE_W = R_TILE * 2 + PILE_GAP;
const R_HUB_W = Math.max(PILE_W, R_DIE * 3 + DIE_GAP * 2);
const R_HUB_H = R_DIE + PILE_GAP + PILE_W;
const R_W = R_NAME + R_GAP + R_TILE + R_GAP + R_HUB_W + R_GAP + R_TILE + R_GAP + R_NAME;
const R_H = FACE_H + R_GAP + R_TILE + R_GAP + R_HUB_H + R_GAP + R_TILE + R_GAP + FACE_H;
const RCX = R_W / 2;
const RCY = R_H / 2;
const ySlotTop = FACE_H + R_GAP;
const yMid = ySlotTop + R_TILE + R_GAP;
const ySlotBot = yMid + R_HUB_H + R_GAP;
const xHub = R_NAME + R_GAP + R_TILE + R_GAP;
const yPile = yMid + R_DIE + PILE_GAP;
/** 0 下、1 右、2 上、3 左。相對十字中心。 */
const SEAT = [
  { x: 0, y: ySlotBot + R_TILE / 2 - RCY },
  { x: R_W - R_NAME - R_GAP - R_TILE / 2 - RCX, y: yMid + R_HUB_H / 2 - RCY },
  { x: 0, y: ySlotTop + R_TILE / 2 - RCY },
  { x: R_NAME + R_GAP + R_TILE / 2 - RCX, y: yMid + R_HUB_H / 2 - RCY },
];
const PILE = [0, 1, 2, 3].map((i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {
    x: xHub + col * (R_TILE + PILE_GAP) + R_TILE / 2 - RCX,
    y: yPile + row * (R_TILE + PILE_GAP) + R_TILE / 2 - RCY,
  };
});
/** 名字在牌的外側。0 下、1 右、2 上、3 左。 */
const NAME_POS = [
  { x: 0, y: ySlotBot + R_TILE + R_GAP + FACE_H / 2 - RCY },
  { x: R_W - R_NAME / 2 - RCX, y: yMid + R_HUB_H / 2 - RCY },
  { x: 0, y: FACE_H / 2 - RCY },
  { x: R_NAME / 2 - RCX, y: yMid + R_HUB_H / 2 - RCY },
];
const LABEL_W = 88;
const LABEL_H = FACE_H;
/** 螢幕座標：0 右、順時針為正 y。下、右、上、左。 */
const CHAIR_ANG = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];

/** 0 螢幕下、1 右、2 上、3 左。字頭朝桌心，坐在那邊的人才看得正。 */
const FACE = ['0deg', '-90deg', '180deg', '90deg'] as const;
const FACE_DEG = [0, -90, 180, 90];

type Step = 'shuffle' | 'dice' | 'draw' | 'swap';

function turnToward(from: number, to: number) {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return from + delta;
}

/** 兩椅之間的弧線中點。起點終點用真正的位子，避免 cos(π/2) 的誤差。 */
function arcMid(from: number, dest: number, rx: number, ry: number) {
  let delta = CHAIR_ANG[dest] - CHAIR_ANG[from];
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const mid = CHAIR_ANG[from] + delta / 2;
  return { x: Math.cos(mid) * rx, y: Math.sin(mid) * ry };
}

function playShuffle(xs: Animated.Value[], ys: Animated.Value[], rots: Animated.Value[]) {
  // ponytail: three fixed beats inside the pile, not a physics shuffle. The winds under the tiles are the real shuffle.
  const move = (perm: number[], extraSpin: number) =>
    Animated.parallel(
      [0, 1, 2, 3].flatMap((i) => {
        const from = PILE[i];
        const to = PILE[perm[i]];
        return [
          Animated.timing(xs[i], {
            toValue: to.x - from.x,
            duration: 340,
            useNativeDriver: nativeDriver,
          }),
          Animated.timing(ys[i], {
            toValue: to.y - from.y,
            duration: 340,
            useNativeDriver: nativeDriver,
          }),
          Animated.timing(rots[i], {
            toValue: extraSpin,
            duration: 340,
            useNativeDriver: nativeDriver,
          }),
        ];
      }),
    );
  return Animated.sequence([
    move([2, 3, 0, 1], 18),
    move([1, 0, 3, 2], -14),
    move([0, 1, 2, 3], 0),
  ]);
}

function WindCard({
  wind,
  disabled,
  hot,
  onPress,
  size = TILE_W,
}: {
  wind: Wind | null;
  disabled: boolean;
  hot: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasDown = useRef(wind === null);

  useEffect(() => {
    if (wasDown.current && wind !== null) {
      scale.setValue(0);
      Animated.timing(scale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: nativeDriver,
      }).start();
    }
    wasDown.current = wind === null;
  }, [scale, wind]);

  return (
    <Animated.View style={{ transform: [{ scaleX: scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={wind ?? '蓋住的風牌'}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.card,
          { width: size, height: size },
          wind ? styles.cardFace : styles.cardBack,
          (hot || wind === '東') && styles.cardEast,
        ]}
      >
        {wind ? (
          <Text style={[styles.glyph, wind === '東' && styles.glyphEast]}>{wind}</Text>
        ) : (
          <View style={styles.backMark} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function Facing({
  index,
  name,
  sub,
  hot,
  box = NAME_W,
  hidden = false,
}: {
  index: number;
  name: string;
  sub: string;
  hot: boolean;
  box?: number;
  hidden?: boolean;
}) {
  const body = (
    <View style={[styles.faceBody, { width: index === 1 || index === 3 ? box : 148 }]}>
      {sub ? <Text style={styles.seatSub}>{sub}</Text> : null}
      <Text numberOfLines={1} style={[styles.seatName, hot && styles.seatNameHot]}>
        {name}
      </Text>
    </View>
  );
  if (index === 1 || index === 3) {
    return (
      <View style={[styles.faceSide, hot && styles.faceHot, hidden && styles.hidden, { width: box, height: box }]}>
        <View style={{ width: box, alignItems: 'center', transform: [{ rotate: FACE[index] }] }}>
          {body}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.faceEnd, hot && styles.faceHot, hidden && styles.hidden]}>
      <View style={index === 2 ? { transform: [{ rotate: '180deg' }] } : undefined}>{body}</View>
    </View>
  );
}

function DiceFace({
  spin,
  value,
  size = DIE,
}: {
  spin: Animated.Value;
  value: string;
  size?: number;
}) {
  return (
    <Animated.View
      style={[
        styles.die,
        { width: size, height: size },
        {
          transform: [
            {
              rotate: spin.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '720deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.dieFace}>{value}</Text>
    </Animated.View>
  );
}

function Ritual({
  order,
  nameOf,
  onDone,
}: {
  order: string[];
  nameOf: (id: string) => string;
  onDone: (draw: WindDraw) => void;
}) {
  const xs = useRef(PILE.map((p) => new Animated.Value(-p.x))).current;
  const ys = useRef(PILE.map((p) => new Animated.Value(-p.y))).current;
  const rots = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const nxs = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const nys = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const nrots = useRef(FACE_DEG.map((deg) => new Animated.Value(deg))).current;
  const spins = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const flicker = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceAnim = useRef<Animated.CompositeAnimation | null>(null);
  const shuffleAnim = useRef<Animated.CompositeAnimation | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const [step, setStep] = useState<Step>('shuffle');
  const [pile, setPile] = useState<Wind[]>([...WINDS]);
  const [opened, setOpened] = useState<(Wind | null)[]>([null, null, null, null]);
  const openedRef = useRef(opened);
  const [dice, setDice] = useState<[number, number, number] | null>(null);
  const [faces, setFaces] = useState<[number, number, number] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [seats, setSeats] = useState<WindSeat[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPile(shuffleWinds());
    const anim = playShuffle(xs, ys, rots);
    shuffleAnim.current = anim;
    anim.start(({ finished }) => {
      if (!cancelled && finished) setStep('dice');
    });
    return () => {
      cancelled = true;
      anim.stop();
      diceAnim.current?.stop();
      if (flicker.current) clearInterval(flicker.current);
    };
  }, [rots, xs, ys]);

  useEffect(() => {
    if (seats.length !== 4 || !dice) return;
    const startIndex = startSeatIndex(dice[0] + dice[1] + dice[2]);
    if (startIndex === null) return;
    let cancelled = false;
    let swapAnim: Animated.CompositeAnimation | null = null;
    let kick: ReturnType<typeof setTimeout> | null = null;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setStep('swap');
      kick = setTimeout(() => {
        if (cancelled) return;
        const tileRx = SEAT[1].x;
        const tileRy = SEAT[0].y;
        const nameRx = NAME_POS[1].x;
        const nameRy = NAME_POS[0].y;
        const moves: Animated.CompositeAnimation[] = [];
        for (let from = 0; from < 4; from++) {
          const wind = seats.find((s) => s.personId === order[from])?.wind;
          if (!wind) continue;
          const dest = (startIndex + WINDS.indexOf(wind)) % 4;
          const tileIndex = openedRef.current.findIndex((w) => w === wind);
          if (tileIndex < 0) continue;
          const tileMid = arcMid(from, dest, tileRx, tileRy);
          const nameMid = arcMid(from, dest, nameRx, nameRy);
          const half = {
            duration: 380,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: nativeDriver,
          };
          moves.push(
            Animated.sequence([
              Animated.timing(xs[tileIndex], { ...half, toValue: tileMid.x - PILE[tileIndex].x }),
              Animated.timing(xs[tileIndex], { ...half, toValue: SEAT[dest].x - PILE[tileIndex].x }),
            ]),
            Animated.sequence([
              Animated.timing(ys[tileIndex], { ...half, toValue: tileMid.y - PILE[tileIndex].y }),
              Animated.timing(ys[tileIndex], { ...half, toValue: SEAT[dest].y - PILE[tileIndex].y }),
            ]),
            Animated.timing(rots[tileIndex], {
              toValue: turnToward(FACE_DEG[from], FACE_DEG[dest]),
              duration: 760,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: nativeDriver,
            }),
            Animated.sequence([
              Animated.timing(nxs[from], { ...half, toValue: nameMid.x - NAME_POS[from].x }),
              Animated.timing(nxs[from], { ...half, toValue: NAME_POS[dest].x - NAME_POS[from].x }),
            ]),
            Animated.sequence([
              Animated.timing(nys[from], { ...half, toValue: nameMid.y - NAME_POS[from].y }),
              Animated.timing(nys[from], { ...half, toValue: NAME_POS[dest].y - NAME_POS[from].y }),
            ]),
            Animated.timing(nrots[from], {
              toValue: turnToward(FACE_DEG[from], FACE_DEG[dest]),
              duration: 760,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: nativeDriver,
            }),
          );
        }
        swapAnim = Animated.parallel(moves);
        swapAnim.start(({ finished }) => {
          if (!cancelled && finished) onDoneRef.current({ order, dice, seats });
        });
      }, 40);
    }, 420);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (kick) clearTimeout(kick);
      swapAnim?.stop();
    };
  }, [dice, nrots, nxs, nys, order, rots, seats, xs, ys]);

  const sum = dice ? dice[0] + dice[1] + dice[2] : null;
  const start = sum === null ? null : startSeatIndex(sum);
  const taken = opened.filter((w) => w !== null).length;
  const turn = start === null ? -1 : (start + taken) % 4;

  const onRoll = () => {
    if (step !== 'dice' || rolling) return;
    const landed: [number, number, number] = [
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ];
    setRolling(true);
    spins.forEach((spin) => spin.setValue(0));
    if (flicker.current) clearInterval(flicker.current);
    flicker.current = setInterval(() => {
      setFaces([
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ]);
    }, 70);
    const anim = Animated.parallel(
      spins.map((spin) =>
        Animated.timing(spin, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
      ),
    );
    diceAnim.current = anim;
    anim.start(({ finished }) => {
      if (flicker.current) clearInterval(flicker.current);
      flicker.current = null;
      if (!finished) return;
      setFaces(landed);
      setDice(landed);
      setRolling(false);
      setStep('draw');
    });
  };

  const onPick = (index: number) => {
    if (step !== 'draw' || !dice || openedRef.current[index]) return;
    const startIndex = startSeatIndex(dice[0] + dice[1] + dice[2]);
    if (startIndex === null) return;
    const soFar = openedRef.current.filter((w) => w !== null).length;
    if (soFar >= 4) return;
    const who = (startIndex + soFar) % 4;
    const wind = pile[index];
    Animated.parallel([
      Animated.timing(xs[index], {
        toValue: SEAT[who].x - PILE[index].x,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(ys[index], {
        toValue: SEAT[who].y - PILE[index].y,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(rots[index], {
        toValue: FACE_DEG[who],
        duration: 320,
        useNativeDriver: nativeDriver,
      }),
    ]).start();
    const next = openedRef.current.map((w, i) => (i === index ? wind : w));
    openedRef.current = next;
    setOpened(next);
    setSeats((prev) =>
      prev.some((s) => s.personId === order[who])
        ? prev
        : [...prev, { personId: order[who], wind }],
    );
  };

  let status = '洗牌';
  if (step === 'dice') status = rolling ? '擲骰中' : `${nameOf(order[0])} 擲骰`;
  if (step === 'swap') status = '換位子';
  else if (step === 'draw' && turn >= 0) {
    status = taken < 4 ? `輪到 ${nameOf(order[turn])}，挑一張` : '入座';
  }

  const tile = (index: number) => {
    const rot = rots[index].interpolate({
      inputRange: [-360, 360],
      outputRange: ['-360deg', '360deg'],
    });
    const open = opened[index] !== null;
    return (
      <Animated.View
        key={index}
        style={[
          styles.flying,
          {
            left: RCX + PILE[index].x - R_TILE / 2,
            top: RCY + PILE[index].y - R_TILE / 2,
            zIndex: open ? 2 : 1,
            transform: [{ translateX: xs[index] }, { translateY: ys[index] }, { rotate: rot }],
          },
        ]}
      >
        <WindCard
          wind={opened[index]}
          size={R_TILE}
          hot={false}
          disabled={step !== 'draw' || open || taken >= 4}
          onPress={() => onPick(index)}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.ritual}>
      <Text style={styles.status}>{status}</Text>
      {(step === 'draw' || step === 'swap') && start !== null && sum !== null ? (
        <Text style={styles.countLine}>
          {sum} 點 · {SEAT_ROLES[start]}先抽 · 東風位在{nameOf(order[start])}這邊
        </Text>
      ) : (
        <Text style={styles.hint}>牌先集中在中間。翻到的會移到抽的人那邊。</Text>
      )}
      <View style={styles.ritualCross}>
        <Facing index={2} box={R_NAME} hidden={step === 'swap'} name={nameOf(order[2])} sub="對家" hot={turn === 2 && taken < 4 && step === 'draw'} />
        <View style={styles.ritualSlot} />
        <View style={styles.ritualMid}>
          <Facing index={3} box={R_NAME} hidden={step === 'swap'} name={nameOf(order[3])} sub="上家" hot={turn === 3 && taken < 4 && step === 'draw'} />
          <View style={styles.ritualSlot} />
          <View style={styles.ritualHub}>
            {step === 'shuffle' ? (
              <View style={styles.diceRow} />
            ) : (
              <View style={styles.diceRow}>
                {spins.map((spin, i) => (
                  <DiceFace key={i} spin={spin} size={R_DIE} value={faces ? String(faces[i]) : '·'} />
                ))}
              </View>
            )}
            <View style={styles.pileBox} />
          </View>
          <View style={styles.ritualSlot} />
          <Facing index={1} box={R_NAME} hidden={step === 'swap'} name={nameOf(order[1])} sub="下家" hot={turn === 1 && taken < 4 && step === 'draw'} />
        </View>
        <View style={styles.ritualSlot} />
        <Facing index={0} box={R_NAME} hidden={step === 'swap'} name={nameOf(order[0])} sub="擲骰" hot={turn === 0 && taken < 4 && step === 'draw'} />
        <View style={styles.tileLayer} pointerEvents="box-none">
          {[0, 1, 2, 3].map(tile)}
          {step === 'swap'
            ? [0, 1, 2, 3].map((from) => {
                const wind = seats.find((s) => s.personId === order[from])?.wind;
                const nrot = nrots[from].interpolate({
                  inputRange: [-360, 360],
                  outputRange: ['-360deg', '360deg'],
                });
                return (
                  <Animated.View
                    key={from}
                    pointerEvents="none"
                    style={[
                      styles.flying,
                      styles.seatLabel,
                      {
                        left: RCX + NAME_POS[from].x - LABEL_W / 2,
                        top: RCY + NAME_POS[from].y - LABEL_H / 2,
                        zIndex: 3,
                        transform: [
                          { translateX: nxs[from] },
                          { translateY: nys[from] },
                          { rotate: nrot },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.seatSub}>{wind === '東' ? '東風位' : wind}</Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.seatName, wind === '東' && styles.seatNameHot]}
                    >
                      {nameOf(order[from])}
                    </Text>
                  </Animated.View>
                );
              })
            : null}
        </View>
      </View>
      {step === 'dice' ? (
        <Button label="擲骰" onPress={onRoll} disabled={rolling} style={styles.wide} />
      ) : null}
    </View>
  );
}

function SeatResult({
  draw,
  nameOf,
  askSame,
  onAgain,
  onReseat,
}: {
  draw: WindDraw;
  nameOf: (id: string) => string;
  askSame: boolean;
  onAgain: () => void;
  onReseat: () => void;
}) {
  const sum = draw.dice[0] + draw.dice[1] + draw.dice[2];
  const start = startSeatIndex(sum);
  const onAgainRef = useRef(onAgain);
  onAgainRef.current = onAgain;

  useEffect(() => {
    if (!askSame) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      showAlert('順序一樣', '這次抓完，逆時針的順序跟剛剛一樣。要重骰嗎？', [
        { text: '就這樣', style: 'cancel' },
        { text: '重骰', onPress: () => onAgainRef.current() },
      ]);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [askSame]);

  const seated = (chair: number) => {
    const wind = start === null ? null : chairWind(start, chair);
    const personId = wind ? draw.seats.find((s) => s.wind === wind)?.personId : undefined;
    return {
      wind,
      name: personId ? nameOf(personId) : '?',
      sub: wind === '東' ? '東風位' : (wind ?? ''),
      hot: wind === '東',
    };
  };

  const face = (chair: number) => {
    const seat = seated(chair);
    return <Facing index={chair} box={R_NAME} name={seat.name} sub={seat.sub} hot={seat.hot} />;
  };
  const tile = (chair: number) => {
    const seat = seated(chair);
    return (
      <View style={{ transform: [{ rotate: FACE[chair] }] }}>
        <WindCard wind={seat.wind} size={R_TILE} hot={seat.hot} disabled onPress={() => undefined} />
      </View>
    );
  };

  return (
    <View style={styles.ritual}>
      <Text style={styles.status}>入座</Text>
      <Text style={styles.hint}>看自己這邊。綠框是東風位。</Text>
      <View style={styles.ritualCross}>
        {face(2)}
        <View style={styles.ritualSlot}>{tile(2)}</View>
        <View style={styles.ritualMid}>
          {face(3)}
          <View style={styles.ritualSlot}>{tile(3)}</View>
          <View style={styles.ritualHub}>
            <View style={styles.diceRow}>
              {draw.dice.map((n, i) => (
                <View key={i} style={[styles.die, { width: R_DIE, height: R_DIE }]}>
                  <Text style={styles.dieFace}>{n}</Text>
                </View>
              ))}
            </View>
            <View style={styles.pileBox} />
          </View>
          <View style={styles.ritualSlot}>{tile(1)}</View>
          {face(1)}
        </View>
        <View style={styles.ritualSlot}>{tile(0)}</View>
        {face(0)}
      </View>
      <Button label="再抓一次" onPress={onAgain} style={styles.wide} />
      <Button label="換人" variant="ghost" onPress={onReseat} />
    </View>
  );
}

export default function WindsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === id));
  const setWindDraw = useTripStore((s) => s.setWindDraw);
  const insets = useSafeAreaInsets();
  const saved =
    trip?.windDraw &&
    trip.windDraw.order.every((pid) => trip.people.some((p) => p.id === pid))
      ? trip.windDraw
      : null;
  const [phase, setPhase] = useState<'pick' | 'ritual' | 'done'>(saved ? 'done' : 'pick');
  const [order, setOrder] = useState<string[]>(saved?.order ?? []);
  const [ritualKey, setRitualKey] = useState(0);
  const [baseline, setBaseline] = useState<string[]>([]);
  const [askSame, setAskSame] = useState(false);

  if (!trip) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>找不到這趟行程</Text>
      </View>
    );
  }

  const nameOf = (pid: string) => trip.people.find((p) => p.id === pid)?.name ?? '?';

  const toggle = (pid: string) => {
    setOrder((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      if (prev.length >= 4) return prev;
      return [...prev, pid];
    });
  };

  const begin = (nextBaseline: string[]) => {
    setBaseline(nextBaseline);
    setAskSame(false);
    setRitualKey((k) => k + 1);
    setPhase('ritual');
  };

  const pickName = (index: number) => (order[index] ? nameOf(order[index]) : '—');

  return (
    <ScreenWash>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space[6] }]}
      >
        {trip.people.length < 4 ? (
          <Text style={styles.status}>坐桌要四個人</Text>
        ) : phase === 'ritual' ? (
          <Ritual
            key={ritualKey}
            order={order}
            nameOf={nameOf}
            onDone={(draw) => {
              setWindDraw(trip.id, draw);
              const cycle = windCycle(draw.seats);
              setAskSame(cycle !== null && baseline.length === 4 && sameSeatOrder(baseline, cycle));
              setPhase('done');
            }}
          />
        ) : phase === 'done' && trip.windDraw ? (
          <SeatResult
            draw={trip.windDraw}
            nameOf={nameOf}
            askSame={askSame}
            onAgain={() => begin(windCycle(trip.windDraw?.seats ?? []) ?? order)}
            onReseat={() => {
              setAskSame(false);
              setOrder(trip.windDraw?.order ?? []);
              setPhase('pick');
            }}
          />
        ) : (
          <View style={styles.ritual}>
            <Text style={styles.status}>抓風位</Text>
            <Text style={styles.hint}>
              手機平放。先點螢幕下方的人，再沿逆時針點右、上、左。
            </Text>
            <View style={styles.cross}>
              <Facing index={2} name={pickName(2)} sub="對家" hot={order.length === 2} />
              <View style={styles.tileSlot} />
              <View style={styles.midRow}>
                <Facing index={3} name={pickName(3)} sub="上家" hot={order.length === 3} />
                <View style={styles.tileSlot} />
                <View style={styles.hub} />
                <View style={styles.tileSlot} />
                <Facing index={1} name={pickName(1)} sub="下家" hot={order.length === 1} />
              </View>
              <View style={styles.tileSlot} />
              <Facing index={0} name={pickName(0)} sub="擲骰" hot={order.length === 0} />
            </View>
            <PersonPicker people={trip.people} selectedIds={order} onToggle={toggle} />
            <Button
              label="開始抓位"
              onPress={() => begin(order)}
              disabled={order.length !== 4}
              style={styles.wide}
            />
          </View>
        )}
      </ScrollView>
    </ScreenWash>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space[2],
    paddingTop: space[4],
  },
  ritual: { gap: space[3], alignItems: 'center' },
  wide: { alignSelf: 'stretch' },
  status: {
    fontFamily: type.brand,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  hint: {
    fontFamily: type.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: space[3],
  },
  countLine: {
    fontFamily: type.bodyMed,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: space[3],
  },
  cross: {
    width: CROSS_W,
    height: CROSS_H,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ritualCross: {
    width: R_W,
    height: R_H,
    alignItems: 'center',
    gap: R_GAP,
    position: 'relative',
  },
  ritualMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R_GAP,
    height: R_HUB_H,
  },
  ritualHub: {
    width: R_HUB_W,
    height: R_HUB_H,
    alignItems: 'center',
  },
  ritualSlot: { width: R_TILE, height: R_TILE },
  diceRow: {
    height: R_DIE,
    flexDirection: 'row',
    gap: DIE_GAP,
    alignItems: 'center',
  },
  pileBox: { width: PILE_W, height: PILE_W, marginTop: PILE_GAP },
  tileLayer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  flying: { position: 'absolute' },
  midRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, height: ROW_H },
  hub: {
    width: CENTER,
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  die: {
    width: DIE,
    height: DIE,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieFace: {
    fontFamily: type.brand,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  tileSlot: { width: TILE_W, height: TILE_H, overflow: 'visible' },
  card: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBack: { backgroundColor: colors.ink },
  cardFace: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  cardEast: { borderColor: colors.mint, borderWidth: 2 },
  backMark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.mintMuted,
  },
  glyph: {
    fontFamily: type.brand,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  glyphEast: { color: colors.mint },
  faceEnd: { height: FACE_H, alignItems: 'center', justifyContent: 'center' },
  faceSide: {
    width: NAME_W,
    height: NAME_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceHot: {},
  hidden: { opacity: 0 },
  seatLabel: {
    width: LABEL_W,
    height: LABEL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceBody: { alignItems: 'center', maxWidth: 140 },
  seatName: {
    fontFamily: type.bodySemi,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  seatNameHot: { color: colors.mint },
  seatSub: {
    fontFamily: type.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  missingText: {
    fontFamily: type.body,
    color: colors.textMuted,
  },
});
