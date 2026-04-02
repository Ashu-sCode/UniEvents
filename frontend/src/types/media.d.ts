// Extend DOM MediaTrackConstraintSet to include the torch property,
// which is supported by some mobile browsers but not in the default TS DOM typings.
export {};

declare global {
  interface MediaTrackConstraintSet {
    torch?: boolean;
  }
}
