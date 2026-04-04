import * as Haptics from 'expo-haptics';

/**
 * Light haptic feedback for button taps
 */
export const lightHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/**
 * Medium haptic feedback for important actions
 */
export const mediumHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

/**
 * Heavy haptic feedback for significant actions
 */
export const heavyHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

/**
 * Success notification haptic
 */
export const successHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/**
 * Error notification haptic
 */
export const errorHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

/**
 * Selection change haptic
 */
export const selectionHaptic = () => {
  Haptics.selectionAsync().catch(() => {});
};
