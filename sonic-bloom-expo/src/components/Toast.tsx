import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'error';
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, type, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  const bgColor = type === 'success' ? '#1DB954' : type === 'error' ? '#ef4444' : '#3b82f6';
  const icon = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'close-circle' : 'information-circle';

  return (
    <Animated.View
      style={{
        ...styles.container,
        opacity: fadeAnim,
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }}
    >
      <Ionicons name={icon as any} size={20} color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
