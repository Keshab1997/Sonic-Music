import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedAppIconProps {
  size?: number;
  style?: any;
}

export const AnimatedAppIcon: React.FC<AnimatedAppIconProps> = ({ size = 120, style }) => {
  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;
  const scaleAnim3 = useRef(new Animated.Value(1)).current;
  const translateY1 = useRef(new Animated.Value(0)).current;
  const translateY2 = useRef(new Animated.Value(0)).current;
  const translateY3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Rotation animation for flower petals
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Petal breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim1, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim1, {
          toValue: 1,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Music note floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY1, {
          toValue: -15,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(translateY1, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY2, {
          toValue: -20,
          duration: 1250,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(translateY2, {
          toValue: 0,
          duration: 1250,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY3, {
          toValue: -10,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(translateY3, {
          toValue: 0,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sound wave pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconSize = size;
  const petalSize = iconSize * 0.2;
  const centerSize = iconSize * 0.15;

  return (
    <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
      {/* Background Circle with Gradient-like effect */}
      <View style={[styles.background, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]} />
      
      {/* Sound Waves */}
      <Animated.View 
        style={[
          styles.soundWave, 
          { 
            width: iconSize * 0.6, 
            height: iconSize * 0.6, 
            borderRadius: iconSize * 0.3,
            opacity: pulseAnim,
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }]
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.soundWave, 
          { 
            width: iconSize * 0.75, 
            height: iconSize * 0.75, 
            borderRadius: iconSize * 0.375,
            opacity: pulseAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.3] }) }]
          }
        ]} 
      />

      {/* Animated Flower Petals */}
      <Animated.View style={[styles.petalsContainer, { transform: [{ rotate }] }]}>
        {[0, 60, 120, 180, 240, 300].map((angle, index) => (
          <Animated.View
            key={angle}
            style={[
              styles.petal,
              {
                width: petalSize * 0.5,
                height: petalSize,
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: -iconSize * 0.2 },
                  { scale: index % 2 === 0 ? scaleAnim1 : scaleAnim2 }
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Flower Center */}
      <View style={[styles.flowerCenter, { width: centerSize, height: centerSize, borderRadius: centerSize / 2 }]} />

      {/* Music Notes */}
      {/* Note 1 - Left */}
      <Animated.View style={[styles.musicNote, { transform: [{ translateY: translateY1 }] }]}>
        <View style={[styles.noteHead, { width: iconSize * 0.12, height: iconSize * 0.1, borderRadius: iconSize * 0.06 }]} />
        <View style={[styles.noteStem, { width: iconSize * 0.03, height: iconSize * 0.25, left: iconSize * 0.09, top: -iconSize * 0.2 }]} />
      </Animated.View>

      {/* Note 2 - Right */}
      <Animated.View style={[styles.musicNote2, { transform: [{ translateY: translateY2 }] }]}>
        <View style={[styles.noteHead, { width: iconSize * 0.11, height: iconSize * 0.09, borderRadius: iconSize * 0.055 }]} />
        <View style={[styles.noteStem, { width: iconSize * 0.03, height: iconSize * 0.25, right: iconSize * 0.09, top: -iconSize * 0.2 }]} />
      </Animated.View>

      {/* Note 3 - Top */}
      <Animated.View style={[styles.musicNote3, { transform: [{ translateY: translateY3 }] }]}>
        <Ionicons name="musical-notes" size={iconSize * 0.25} color="#ffffff" />
      </Animated.View>

      {/* Center Play Icon */}
      <View style={styles.centerIcon}>
        <Ionicons name="play" size={iconSize * 0.2} color="#1DB954" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    backgroundColor: '#1DB954',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  soundWave: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  petalsContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petal: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  flowerCenter: {
    position: 'absolute',
    backgroundColor: '#1DB954',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  musicNote: {
    position: 'absolute',
    left: '15%',
    top: '25%',
  },
  musicNote2: {
    position: 'absolute',
    right: '15%',
    top: '20%',
  },
  musicNote3: {
    position: 'absolute',
    top: '8%',
  },
  noteHead: {
    backgroundColor: '#ffffff',
  },
  noteStem: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  centerIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '35%',
    height: '35%',
    borderRadius: 100,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
