// app/(tabs)/_layout.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Animated, Easing, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: "none", // hide default bar, use our custom one
        },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="homescreen" options={{ title: "Home" }} />
      <Tabs.Screen name="stockscreen" options={{ title: "Inventory" }} />
      <Tabs.Screen name="recipescreen" options={{ title: "Recipes" }} />
      <Tabs.Screen name="shoppingscreen" options={{ title: "Shopping" }} />
      <Tabs.Screen name="profilescreen" options={{ title: "Profile" }} />
    </Tabs>
  );
}

/* =========================================================
   Animated Tab Bar Component
========================================================= */
function AnimatedTabBar({ state, navigation }: any) {
  const { width } = useWindowDimensions();
  const tabBarWidth = width - 32; // accounting for horizontal padding
  const tabCount = state.routes.length;
  const tabWidth = tabBarWidth / tabCount;
  const indicatorWidth = 54;
  
  // Animated values
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  
  // Calculate indicator position for a given index
  const getIndicatorPosition = (index: number) => {
    return (tabWidth * index) + (tabWidth / 2) - (indicatorWidth / 2);
  };

  // Initialize position
  useEffect(() => {
    translateX.setValue(getIndicatorPosition(state.index));
  }, []);

  // Animate when tab changes
  useEffect(() => {
    const toValue = getIndicatorPosition(state.index);
    
    // Sequence: stretch, move, and settle
    Animated.sequence([
      // First, stretch horizontally (water expanding)
      Animated.parallel([
        Animated.timing(scaleX, {
          toValue: 1.1,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleY, {
          toValue: 0.85,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Then move with spring physics while gradually returning to normal shape
      Animated.parallel([
        Animated.spring(translateX, {
          toValue,
          tension: 68,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(scaleX, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.elastic(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleY, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.elastic(1.5)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [state.index]);

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = "#ffe9dc";
    
    switch (routeName) {
      case "homescreen":
        return <Ionicons name="home" size={26} color={color} />;
      case "stockscreen":
        return <Feather name="edit-3" size={24} color={color} />;
      case "recipescreen":
        return <Ionicons name="restaurant" size={26} color={color} style={{ opacity: 0.4 }} />;
      case "shoppingscreen":
        return <Ionicons name="cart" size={26} color={color} />;
      case "profilescreen":
        return <Ionicons name="person" size={26} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBar}>
        {/* Animated flowing indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [
                { translateX },
                { scaleX },
                { scaleY },
              ],
            },
          ]}
        />
        
        {/* Tab buttons */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) {
              if (route.name === "recipescreen") {
                Alert.alert("Disabled for now...");
                return;
              }
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabButton}
              activeOpacity={0.8}
              onPress={onPress}
            >
              {getIcon(route.name, isFocused)}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: "#fff5f0",
  },
  tabBar: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#b7747c",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "space-around",
    position: "relative",
    overflow: "hidden",
  },
  tabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  indicator: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 1,
    left: 0,
  },
});
