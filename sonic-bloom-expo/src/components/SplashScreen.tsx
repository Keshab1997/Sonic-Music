import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, duration = 3000 }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const note1Anim = useRef(new Animated.Value(0)).current;
  const note2Anim = useRef(new Animated.Value(0)).current;

  const iconSize = width * 0.45; 
  const petalWidth = iconSize * 0.12;
  const petalHeight = iconSize * 0.35;

  useEffect(() => {
    // Entrance Animation
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();

    // Infinite Rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Floating Notes
    const float = (anim: Animated.Value) => 
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -15, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();

    float(note1Anim);
    float(note2Anim);

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start(onFinish);
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        
        {/* Pulsing Background Rings */}
        <View style={styles.ringContainer}>
            {[1.2, 1.5, 1.8].map((s, i) => (
                <View key={i} style={[styles.pulseRing, { 
                    width: iconSize * s, 
                    height: iconSize * s, 
                    borderRadius: (iconSize * s) / 2 
                }]} />
            ))}
        </View>

        {/* Main Logo Structure */}
        <Animated.View style={[styles.logoWrapper, { width: iconSize, height: iconSize, transform: [{ scale: scaleAnim }] }]}>
          
          {/* Green Circle Background */}
          <View style={[styles.greenCircle, { borderRadius: iconSize / 2 }]} />
          
          {/* Flower Petals Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation }], justifyContent: 'center', alignItems: 'center' }]}>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <View
                key={angle}
                style={[
                  styles.petal,
                  {
                    width: petalWidth,
                    height: petalHeight,
                    borderRadius: petalWidth / 2,
                    // এই ক্যালকুলেশনটি পাপড়িকে একদম মাঝখানে রাখে
                    left: (iconSize / 2) - (petalWidth / 2),
                    top: (iconSize / 2) - (petalHeight / 2),
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -iconSize * 0.22 } // পাপড়ি কতটুকু ছড়ানো হবে
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Black Center Circle */}
          <View style={[styles.centerHole, { 
              width: iconSize * 0.2, 
              height: iconSize * 0.2, 
              borderRadius: (iconSize * 0.2) / 2 
          }]} />

          {/* Floating Music Notes */}
          <Animated.View style={[styles.notePos, { left: -10, top: 0, transform: [{ translateY: note1Anim }] }]}>
            <Ionicons name="musical-notes" size={iconSize * 0.25} color="white" style={styles.noteShadow} />
          </Animated.View>
          <Animated.View style={[styles.notePos, { right: -5, top: 20, transform: [{ translateY: note2Anim }] }]}>
            <Ionicons name="musical-note" size={iconSize * 0.2} color="white" style={styles.noteShadow} />
          </Animated.View>

        </Animated.View>

        {/* Brand Text */}
        <View style={styles.textGroup}>
          <Text style={styles.mainTitle}>SONIC BLOOM</Text>
          <Text style={styles.subTitle}>Your Music, Your Way</Text>
        </View>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  ringContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.2)',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  greenCircle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1DB954',
  },
  petal: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  centerHole: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  notePos: {
    position: 'absolute',
    zIndex: 20,
  },
  noteShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  textGroup: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1DB954',
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: 'serif', // অ্যান্ড্রয়েডে অনেকটা স্ক্রিনশটের মতো দেখাবে
  },
  subTitle: {
    fontSize: 14,
    color: '#777',
    letterSpacing: 2,
    marginTop: 10,
    fontWeight: '300',
  },
});