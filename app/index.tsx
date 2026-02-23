// app/index.tsx
// This is the entry point — shows the loading screen then navigates to tabs.
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const LOAD_DURATION = 3000; // 3 seconds

export default function LoadingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const [percentage, setPercentage] = useState(0);

  const barWidth = width - 80;

  useEffect(() => {
    // Fade in the content
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Gentle logo bounce-in
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Progress bar fill
    Animated.timing(progress, {
      toValue: 1,
      duration: LOAD_DURATION,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // Percentage counter
    const interval = setInterval(() => {
      setPercentage((prev) => {
        if (prev >= 100) return 100;
        return Math.min(prev + 2, 100);
      });
    }, LOAD_DURATION / 50);

    // Navigate to home after loading completes
    const timer = setTimeout(() => {
      router.replace("/tabs/homescreen");
    }, LOAD_DURATION + 200);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barWidth],
  });

  return (
    <View style={styles.container}>
      {/* Background image */}
      <Image
        source={require("../assets/images/loading_screen.png")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />

      {/* Soft overlay at bottom for readability */}
      <View style={styles.bottomOverlay} />

      {/* Animated content */}
      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* Push everything to bottom */}
        <View style={styles.spacer} />

        {/* Loading section */}
        <View style={styles.loadingSection}>
          {/* Logo */}
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image
              source={require("../assets/images/Kitchie_logo.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </Animated.View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Preparing your kitchen...</Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarTrack, { width: barWidth }]}>
              <Animated.View
                style={[styles.progressBarFill, { width: progressWidth }]}
              />
              <Animated.View
                style={[styles.progressBarShine, { width: progressWidth }]}
              />
            </View>
          </View>

          {/* Percentage */}
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff5f0",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: "rgba(255,245,240,0.88)",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
  },
  spacer: {
    flex: 1,
  },
  loadingSection: {
    alignItems: "center",
    paddingBottom: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  logoImage: {
    height: 48,
    width: 170,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#c98b92",
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    marginTop: 8,
    alignItems: "center",
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(183,116,124,0.15)",
    overflow: "hidden",
  },
  progressBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: "#f29f9b",
  },
  progressBarShine: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b7747c",
    marginTop: 2,
  },
});
