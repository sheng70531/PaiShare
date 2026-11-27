/** How far the bar must rise so it sits on the keyboard. 0 when the window already resized. */
export function keyboardLift(windowHeight: number, keyboardTop: number | null): number {
  if (keyboardTop == null) return 0;
  return Math.max(0, Math.round(windowHeight - keyboardTop));
}
