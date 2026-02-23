// app/(tabs)/stockscreen.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/stockscreen.styles";

import { getIngredientImage, INGREDIENT_KEYS } from "../../src/ingredientImages";

/* =========================================================
   Types
========================================================= */
type Ingredient = {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category?: string;
  expiryDate?: string; // ISO date string e.g. "2025-03-15"
};

/* =========================================================
   Constants
========================================================= */
const STORAGE_KEY = "kitchie.ingredients.v1";

const CATEGORIES = [
  { key: "all", label: "All", icon: "grid-outline" as const },
  { key: "produce", label: "Vegetable", icon: "leaf-outline" as const },
  { key: "dairy", label: "Dairy", icon: "water-outline" as const },
  { key: "meat", label: "Meat", icon: "flame-outline" as const },
  { key: "grains", label: "Fruit", icon: "nutrition-outline" as const },
  { key: "spices", label: "Spices", icon: "color-filter-outline" as const },
  { key: "frozen", label: "Frozen", icon: "snow-outline" as const },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" as const },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.key !== "all");

const METRIC_OPTIONS = [
  { key: "unit", label: "unit" },
  { key: "g", label: "g" },
  { key: "kg", label: "kg" },
  { key: "ml", label: "ml" },
  { key: "L", label: "L" },
  { key: "cup", label: "cup" },
  { key: "tbsp", label: "tbsp" },
  { key: "tsp", label: "tsp" },
];

/* =========================================================
   Ingredient Variations
========================================================= */
const INGREDIENT_VARIATIONS: Record<string, string[]> = {
  "soy sauce": ["Sushi", "Light", "Dark"],
};

/** Get the base ingredient key from a potentially varianted name */
const getBaseIngredient = (name: string): string => {
  const match = name.match(/^(.+?)\s*\(.*\)$/);
  return match ? match[1].trim().toLowerCase() : name.toLowerCase();
};

/** Check if a name (possibly with variation) is a valid ingredient */
const isValidIngredient = (name: string): boolean => {
  const base = getBaseIngredient(name);
  if (INGREDIENT_KEYS.includes(base)) return true;
  return INGREDIENT_KEYS.includes(name.toLowerCase());
};

/* =========================================================
   Helpers
========================================================= */
const normalize = (s: string) => s.trim().toLowerCase();

const parseNumber = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const toTitle = (s: string) => {
  return s
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
};

/** Format an ISO date string to a friendly display format */
const formatDate = (iso: string | undefined) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/** Check if an ingredient is expired or expiring soon (within 3 days) */
const getExpiryStatus = (iso: string | undefined): "ok" | "soon" | "expired" | "none" => {
  if (!iso) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(iso + "T00:00:00");
  if (isNaN(exp.getTime())) return "none";
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "soon";
  return "ok";
};

/* =========================================================
   Component
========================================================= */
const StockScreen: FC = () => {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editExpiryDate, setEditExpiryDate] = useState("");

  const [modalVisible, setModalVisible] = useState(false);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIngredientKey, setSelectedIngredientKey] = useState<string | null>(null);

  // Metric dropdown state
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  // Variation picker state
  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const [pendingVariationKey, setPendingVariationKey] = useState<string | null>(null);

  // ✅ LOAD whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!alive) return;

          const data: Ingredient[] = raw ? JSON.parse(raw) : [];
          setIngredients(Array.isArray(data) ? data : []);
        } catch (e) {
          console.warn("Failed to load ingredients", e);
          if (!alive) return;
          setIngredients([]);
        }
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  // SAVE whenever ingredients changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients));
        // Reset sprite back to thinking when stock changes
        await AsyncStorage.removeItem("kitchie.lastCooked.ts");
      } catch (e) {
        console.warn("Failed to save ingredients", e);
      }
    })();
  }, [ingredients]);

  // Filtered ingredients by category
  const filteredIngredients = useMemo(() => {
    if (activeCategory === "all") return ingredients;
    return ingredients.filter((ing) => (ing.category || "other") === activeCategory);
  }, [ingredients, activeCategory]);

  // Autocomplete suggestions
  const ingredientSuggestions = useMemo(() => {
    const q = normalize(editName);
    if (!q) return [];
    return INGREDIENT_KEYS.filter((k) => k.includes(q)).slice(0, 6);
  }, [editName]);

  const openEdit = (item: Ingredient) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit || "x");
    setEditCategory(item.category || "other");
    setEditExpiryDate(item.expiryDate ? isoToExpiry(item.expiryDate) : "");
    setSelectedIngredientKey(item.name);
    setShowSuggestions(false);
    setShowMetricDropdown(false);
    setModalVisible(true);
  };

  const closeEdit = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("");
    setEditCategory("other");
    setEditExpiryDate("");
    setSelectedIngredientKey(null);
    setShowSuggestions(false);
    setShowMetricDropdown(false);
    setShowVariationPicker(false);
    setPendingVariationKey(null);
  };

  const openAdd = () => {
    setSelectedItem(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("x");
    setEditCategory("other");
    setEditExpiryDate("");
    setSelectedIngredientKey(null);
    setShowSuggestions(false);
    setShowMetricDropdown(false);
    setModalVisible(true);
  };

  const isEditMode = !!selectedItem;

  /** Validate the expiry date input (DD/MM/YYYY) */
  const validateExpiryDate = (value: string): boolean => {
    if (!value) return true; // optional field
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(value)) return false;
    const [dd, mm, yyyy] = value.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return !isNaN(d.getTime()) && d.getDate() === Number(dd);
  };

  /** Convert DD/MM/YYYY to ISO string for storage */
  const expiryToIso = (value: string): string | undefined => {
    if (!value || !validateExpiryDate(value)) return undefined;
    const [dd, mm, yyyy] = value.split("/");
    return `${yyyy}-${mm}-${dd}`;
  };

  /** Convert ISO string to DD/MM/YYYY for display in input */
  const isoToExpiry = (iso: string): string => {
    if (!iso) return "";
    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  // 🧹 Secret: clear all inventory
  const clearAllIngredients = async () => {
    setIngredients([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  // ✅ Add: merge duplicates by (normalized name + unit)
  const addIngredient = () => {
    const candidate = selectedIngredientKey ?? normalize(editName);

    // 🌟 Wildcard: add all ingredients with qty 1
    if (candidate === "*") {
      const allItems: Ingredient[] = INGREDIENT_KEYS.map((key, i) => ({
        id: `${Date.now()}-${i}`,
        name: key,
        quantity: "1",
        unit: "x",
        category: "other",
      }));
      setIngredients(allItems);
      closeEdit();
      return;
    }

    if (!isValidIngredient(candidate)) {
      Alert.alert("Pick from the list", "Please select an ingredient from suggestions.");
      return;
    }

    const unitRaw = (editUnit.trim() || "x").toLowerCase();
    const qtyToAdd = parseNumber(editQuantity);

    if (qtyToAdd <= 0) {
      Alert.alert("Invalid quantity", "Please enter a valid quantity.");
      return;
    }

    if (!validateExpiryDate(editExpiryDate)) {
      Alert.alert("Invalid date", "Please enter a valid date in DD/MM/YYYY format.");
      return;
    }

    const nameKey = normalize(candidate);

    setIngredients((prev) => {
      const existingIndex = prev.findIndex(
        (ing) =>
          normalize(ing.name) === nameKey && (ing.unit?.toLowerCase() || "x") === unitRaw
      );

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const existingQty = parseNumber(existing.quantity);
        const nextQty = existingQty + qtyToAdd;

        const updated: Ingredient = {
          ...existing,
          quantity: formatNumber(nextQty),
          unit: unitRaw,
          category: editCategory,
          expiryDate: expiryToIso(editExpiryDate) || existing.expiryDate,
        };

        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      }

      const newItem: Ingredient = {
        id: Date.now().toString(),
        name: candidate,
        quantity: formatNumber(qtyToAdd),
        unit: unitRaw,
        category: editCategory,
        expiryDate: expiryToIso(editExpiryDate),
      };

      return [...prev, newItem];
    });

    closeEdit();
  };

  const saveEdit = () => {
    if (!selectedItem) return;

    const candidate = selectedIngredientKey ?? normalize(editName);

    if (!isValidIngredient(candidate)) {
      Alert.alert("Pick from the list", "Please select an ingredient from suggestions.");
      return;
    }

    if (!validateExpiryDate(editExpiryDate)) {
      Alert.alert("Invalid date", "Please enter a valid date in DD/MM/YYYY format.");
      return;
    }

    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === selectedItem.id
          ? {
              ...ing,
              name: candidate,
              quantity: editQuantity.trim() || ing.quantity,
              unit: (editUnit.trim() || "x").toLowerCase(),
              category: editCategory,
              expiryDate: expiryToIso(editExpiryDate),
            }
          : ing
      )
    );

    closeEdit();
  };

  const deleteIngredient = () => {
    if (!selectedItem) return;
    setIngredients((prev) => prev.filter((ing) => ing.id !== selectedItem.id));
    closeEdit();
  };

  /* =========================================================
     Render: List Item
  ========================================================= */
  const renderItem = ({ item }: { item: Ingredient }) => {
    const expiryStatus = getExpiryStatus(item.expiryDate);
    const categoryObj = CATEGORY_OPTIONS.find((c) => c.key === (item.category || "other"));

    return (
      <TouchableOpacity
        style={styles.listItemCard}
        activeOpacity={0.8}
        onPress={() => openEdit(item)}
      >
        <Image source={getIngredientImage(getBaseIngredient(item.name))} style={styles.listItemImage}/>

        <View style={styles.listItemContent}>
          <Text style={styles.listItemName}>{toTitle(item.name)}</Text>
          <View style={styles.listItemDetails}>
            <Text style={styles.listItemQty}>
              {item.quantity} {item.unit}
            </Text>
            {categoryObj && (
              <View style={styles.listItemCategoryBadge}>
                <Ionicons name={categoryObj.icon} size={12} color="#b7747c" />
                <Text style={styles.listItemCategoryText}>{categoryObj.label}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.listItemRight}>
          {item.expiryDate ? (
            <View
              style={[
                styles.expiryBadge,
                expiryStatus === "expired" && styles.expiryBadgeExpired,
                expiryStatus === "soon" && styles.expiryBadgeSoon,
                expiryStatus === "ok" && styles.expiryBadgeOk,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={
                  expiryStatus === "expired"
                    ? "#d32f2f"
                    : expiryStatus === "soon"
                    ? "#e65100"
                    : "#558b2f"
                }
              />
              <Text
                style={[
                  styles.expiryBadgeText,
                  expiryStatus === "expired" && styles.expiryTextExpired,
                  expiryStatus === "soon" && styles.expiryTextSoon,
                  expiryStatus === "ok" && styles.expiryTextOk,
                ]}
              >
                {expiryStatus === "expired" ? "Expired" : formatDate(item.expiryDate)}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color="#d4b5b0" />
        </View>
      </TouchableOpacity>
    );
  };

  /* =========================================================
     Render
  ========================================================= */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={28} color="#f29f9b" />
          </TouchableOpacity>

          <TouchableOpacity onPress={clearAllIngredients} activeOpacity={1}>
            <Text style={styles.headerTitle}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openAdd} style={styles.addButton} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#f29f9b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Look at our assortment of deliciousness.</Text>

        {/* CATEGORY FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterRow}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const count =
              cat.key === "all"
                ? ingredients.length
                : ingredients.filter((i) => (i.category || "other") === cat.key).length;

            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={isActive ? "#fff" : "#b7747c"}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.categoryCountBadge, isActive && styles.categoryCountBadgeActive]}>
                    <Text style={[styles.categoryCountText, isActive && styles.categoryCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* INVENTORY LIST */}
        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="leaf-outline" size={48} color="#e0c4c4" />
              <Text style={styles.emptyTitle}>
                {activeCategory === "all"
                  ? "No ingredients yet"
                  : `No ${CATEGORIES.find((c) => c.key === activeCategory)?.label || ""} items`}
              </Text>
              <Text style={styles.emptySub}>Tap + to add one.</Text>
            </View>
          }
        />

        {/* MODAL */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeEdit}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit}>
            <View />
          </Pressable>

          <View style={styles.invModalCard}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>
                {isEditMode ? "Edit Ingredient" : "Add Ingredient"}
              </Text>

              <TouchableOpacity onPress={closeEdit} style={styles.sheetClose} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#b7747c" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={() => setShowMetricDropdown(false)}>
              {/* Name */}
              <Text style={styles.createLabel}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={(t) => {
                  setEditName(t);
                  setSelectedIngredientKey(null);
                  setShowSuggestions(true);
                }}
                style={styles.createInput}
                placeholder="Search ingredient..."
                placeholderTextColor="#e0c4c4"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  setShowSuggestions(true);
                  setShowMetricDropdown(false);
                }}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && ingredientSuggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  {ingredientSuggestions.map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={styles.suggestionItem}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (INGREDIENT_VARIATIONS[k]) {
                          setPendingVariationKey(k);
                          setShowVariationPicker(true);
                          setShowSuggestions(false);
                        } else {
                          setEditName(toTitle(k));
                          setSelectedIngredientKey(k);
                          setShowSuggestions(false);
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{toTitle(k)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Amount + Metric row */}
              <View style={[styles.inputRow, { zIndex: 10 }]}>
                <View style={styles.inputRowItem}>
                  <Text style={[styles.createLabel, { marginTop: 12 }]}>Amount</Text>
                  <TextInput
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    style={styles.createInput}
                    placeholder="0"
                    placeholderTextColor="#e0c4c4"
                    keyboardType="numeric"
                    onFocus={() => {
                      setShowSuggestions(false);
                      setShowMetricDropdown(false);
                    }}
                  />
                </View>
                <View style={[styles.inputRowItemSmall, { position: "relative", zIndex: 10 }]}>
                  <Text style={[styles.createLabel, { marginTop: 12 }]}>Metric</Text>
                  <TouchableOpacity
                    style={[
                      styles.createInput,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingRight: 8,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setShowMetricDropdown((prev) => !prev);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={{ color: "#b7747c", fontWeight: "800", fontSize: 14 }}>
                      {METRIC_OPTIONS.find((m) => m.key === editUnit)?.label || "x"}
                    </Text>
                    <Ionicons
                      name={showMetricDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#b7747c"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category */}
              <Text style={[styles.createLabel, { marginTop: 14 }]}>Category</Text>
              <View style={styles.categoryPickerRow}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = editCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryPick, isSelected && styles.categoryPickActive]}
                      onPress={() => setEditCategory(cat.key)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={18}
                        color={isSelected ? "#fff" : "#b7747c"}
                      />
                      <Text
                        style={[
                          styles.categoryPickText,
                          isSelected && styles.categoryPickTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Expiry Date */}
              <Text style={[styles.createLabel, { marginTop: 14 }]}>Expiry Date</Text>
              <View style={styles.expiryInputRow}>
                <Ionicons name="calendar-outline" size={18} color="#b7747c" style={{ marginRight: 8 }} />
                <TextInput
                  value={editExpiryDate}
                  onChangeText={setEditExpiryDate}
                  style={[styles.createInput, { flex: 1 }]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#e0c4c4"
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                  maxLength={10}
                  onFocus={() => {
                    setShowSuggestions(false);
                    setShowMetricDropdown(false);
                  }}
                />
              </View>
              {editExpiryDate !== "" && !validateExpiryDate(editExpiryDate) && (
                <Text style={styles.errorText}>Enter a valid date (DD/MM/YYYY)</Text>
              )}

              {/* Buttons */}
              <View style={styles.modalButtonsRow}>
                {isEditMode ? (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonDanger]}
                    onPress={deleteIngredient}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalButtonDangerText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                <View style={styles.modalButtonsRight}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={closeEdit}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={isEditMode ? saveEdit : addIngredient}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.modalButtonPrimaryText}>
                      {isEditMode ? "Save" : "Add"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* METRIC PICKER OVERLAY (inline, not a nested Modal — fixes iOS) */}
            {showMetricDropdown && (
              <Pressable
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 100,
                  borderRadius: 18,
                }}
                onPress={() => setShowMetricDropdown(false)}
              >
                <View
                  style={{
                    width: 220,
                    maxHeight: 360,
                    borderRadius: 18,
                    backgroundColor: "#ffe9dc",
                    padding: 6,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 10,
                  }}
                  onStartShouldSetResponder={() => true}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "900",
                      color: "#b7747c",
                      textAlign: "center",
                      paddingVertical: 10,
                    }}
                  >
                    Select Metric
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    {METRIC_OPTIONS.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          marginHorizontal: 4,
                          marginBottom: 4,
                          borderRadius: 12,
                          backgroundColor:
                            editUnit === m.key
                              ? "rgba(242,159,155,0.25)"
                              : "rgba(255,255,255,0.65)",
                        }}
                        activeOpacity={0.85}
                        onPress={() => {
                          setEditUnit(m.key);
                          setShowMetricDropdown(false);
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: editUnit === m.key ? "#f29f9b" : "#b7747c",
                          }}
                        >
                          {m.label}
                        </Text>
                        {editUnit === m.key && (
                          <Ionicons name="checkmark" size={18} color="#f29f9b" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            )}

            {/* VARIATION PICKER OVERLAY (inline, not a nested Modal — fixes iOS) */}
            {showVariationPicker && pendingVariationKey && (
              <Pressable
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 100,
                  borderRadius: 18,
                }}
                onPress={() => {
                  setShowVariationPicker(false);
                  setPendingVariationKey(null);
                }}
              >
                <View
                  style={{
                    width: 260,
                    maxHeight: 400,
                    borderRadius: 18,
                    backgroundColor: "#ffe9dc",
                    padding: 6,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 10,
                  }}
                  onStartShouldSetResponder={() => true}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "900",
                      color: "#b7747c",
                      textAlign: "center",
                      paddingVertical: 10,
                    }}
                  >
                    Select Variation
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#c98b92",
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {toTitle(pendingVariationKey)}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    {/* Regular (no variation) */}
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        marginHorizontal: 4,
                        marginBottom: 4,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.65)",
                      }}
                      activeOpacity={0.85}
                      onPress={() => {
                        setEditName(toTitle(pendingVariationKey));
                        setSelectedIngredientKey(pendingVariationKey);
                        setShowVariationPicker(false);
                        setPendingVariationKey(null);
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#b7747c" }}>
                        Regular
                      </Text>
                    </TouchableOpacity>

                    {/* Variations */}
                    {(INGREDIENT_VARIATIONS[pendingVariationKey] ?? []).map((variation) => {
                      const fullName = `${pendingVariationKey} (${variation.toLowerCase()})`;
                      return (
                        <TouchableOpacity
                          key={variation}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            marginHorizontal: 4,
                            marginBottom: 4,
                            borderRadius: 12,
                            backgroundColor: "rgba(255,255,255,0.65)",
                          }}
                          activeOpacity={0.85}
                          onPress={() => {
                            setEditName(toTitle(fullName));
                            setSelectedIngredientKey(fullName);
                            setShowVariationPicker(false);
                            setPendingVariationKey(null);
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: "800", color: "#b7747c" }}>
                            {variation}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </Pressable>
            )}
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

export default StockScreen;