import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FC, useCallback, useState } from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getIngredientAsset } from "../../src/ingredientImages";
import { styles } from "../../styles/homescreen.styles";
import AnimatedCookingSprite from "../components/AnimatedCookingSprite";
import WiggleImage from "../components/WiggleImage";

type Ingredient = {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
};

const STORAGE_KEY = "kitchie.ingredients.v1";
const LAST_COOKED_KEY = "kitchie.lastCooked.ts";

const HomeScreen: FC = () => {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [spriteKey, setSpriteKey] = useState(0);
  const [spriteVariant, setSpriteVariant] = useState<"thinking" | "cooking">("thinking");

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      // Bump key to force AnimatedCookingSprite remount
      setSpriteKey((prev) => prev + 1);

      (async () => {
        try {
          const [raw, lastCookedRaw] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(LAST_COOKED_KEY),
          ]);
          if (!alive) return;

          setIngredients(raw ? JSON.parse(raw) : []);

          // Show cooking sprite if user has cooked a recipe, otherwise thinking
          if (lastCookedRaw) {
            setSpriteVariant("cooking");
          } else {
            setSpriteVariant("thinking");
          }
        } catch (e) {
          console.warn("Failed to load pantry", e);
        }
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Image
          source={require("../../assets/images/Kitchie_logo.png")}
          style={styles.logoImage}
        />

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert("Coming soon...")}>
            <Feather name="settings" size={30} color="#f08984" />
          </TouchableOpacity>
        </View>
      </View>

      {/* KITCHEN AREA */}
      <View style={styles.kitchenArea}>
        {/* Middle shelf */}
        <View style={styles.produce}>
          {ingredients.slice(0, 8).map((item) => {
            const asset = getIngredientAsset(item.name);
            return (
              <WiggleImage
                key={item.id}
                source={asset.source}
                style={[styles.ingredientSpriteBase, asset.style]}
              />
            );
          })}
        </View>

        {/* Animated cooking sprite — key change forces remount & new random set */}
        <View style={styles.cookingSprite}>
          <AnimatedCookingSprite key={spriteKey} variant={spriteVariant} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
