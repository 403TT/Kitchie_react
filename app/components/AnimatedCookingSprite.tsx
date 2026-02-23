import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

const thinkFrames = [
  require("../../assets/images/sprite/sprite_think1.png"),
  require("../../assets/images/sprite/sprite_think2.png"),
];

const cookingFrames = [
  require("../../assets/images/sprite/sprite_cooking3.png"),
  require("../../assets/images/sprite/sprite_cooking4.png"),
];

type Props = {
  /** "thinking" (default) or "cooking" */
  variant?: "thinking" | "cooking";
};

const AnimatedCookingSprite = ({ variant = "thinking" }: Props) => {
  const [currentFrame, setCurrentFrame] = useState(0);

  const frames = variant === "cooking" ? cookingFrames : thinkFrames;

  useEffect(() => {
    setCurrentFrame(0);
  }, [variant]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 500);

    return () => clearInterval(interval);
  }, [frames]);

  return (
    <Image
      source={frames[currentFrame]}
      style={styles.sprite}
      contentFit="contain"
    />
  );
};

const styles = StyleSheet.create({
  sprite: {
    width: 300,
    height: 300,
  },
});

export default AnimatedCookingSprite;
