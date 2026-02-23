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

const ALL_CATEGORY = "all";

const METRIC_OPTIONS = [
  { key: "x", label: "x" },
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

/* =========================================================
   Unit Conversion System
========================================================= */
type UnitFamily = "mass" | "volume" | "countable";

const UNIT_TO_BASE: Record<string, { family: UnitFamily; factor: number }> = {
  g:    { family: "mass",      factor: 1 },
  kg:   { family: "mass",      factor: 1000 },
  ml:   { family: "volume",    factor: 1 },
  l:    { family: "volume",    factor: 1000 },
  cup:  { family: "volume",    factor: 240 },
  tbsp: { family: "volume",    factor: 15 },
  tsp:  { family: "volume",    factor: 5 },
  x:    { family: "countable", factor: 1 },
  unit: { family: "countable", factor: 1 },
};

const normalizeUnit = (u: string | undefined): string => (u ?? "x").trim().toLowerCase();

const toBaseQty = (qty: number, unit: string): { base: number; family: UnitFamily } | null => {
  const info = UNIT_TO_BASE[normalizeUnit(unit)];
  if (!info) return null;
  return { base: qty * info.factor, family: info.family };
};

const fromBaseQty = (baseQty: number, targetUnit: string): number | null => {
  const info = UNIT_TO_BASE[normalizeUnit(targetUnit)];
  if (!info) return null;
  return baseQty / info.factor;
};

const unitsCompatible = (a: string | undefined, b: string | undefined): boolean => {
  const infoA = UNIT_TO_BASE[normalizeUnit(a)];
  const infoB = UNIT_TO_BASE[normalizeUnit(b)];
  if (!infoA || !infoB) return false;
  return infoA.family === infoB.family;
};

/**
 * Given a base-unit total, pick the best display unit for its family.
 * Rules:
 *   Mass:   ≥ 1000 g  → kg, otherwise g
 *   Volume: ≥ 1000 ml → L,  otherwise ml
 *   Countable: always "unit"
 */
const bestUnitForBase = (baseQty: number, family: UnitFamily): { qty: number; unit: string } => {
  if (family === "mass") {
    if (baseQty >= 1000) return { qty: Math.round((baseQty / 1000) * 100) / 100, unit: "kg" };
    return { qty: Math.round(baseQty * 100) / 100, unit: "g" };
  }
  if (family === "volume") {
    if (baseQty >= 1000) return { qty: Math.round((baseQty / 1000) * 100) / 100, unit: "l" };
    return { qty: Math.round(baseQty * 100) / 100, unit: "ml" };
  }
  return { qty: Math.round(baseQty * 100) / 100, unit: "unit" };
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
  const [searchQuery, setSearchQuery] = useState("");

  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState("");
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
  // Derive unique categories from ingredients
  const userCategories = useMemo(() => {
    const catSet = new Set<string>();
    for (const ing of ingredients) {
      const cat = (ing.category || "").trim();
      if (cat) catSet.add(cat);
    }
    // Sort alphabetically
    return Array.from(catSet).sort((a, b) => a.localeCompare(b));
  }, [ingredients]);

  // Filtered ingredients by category + search
  const filteredIngredients = useMemo(() => {
    let result = ingredients;
    if (activeCategory !== ALL_CATEGORY) {
      result = result.filter((ing) => (ing.category || "") === activeCategory);
    }
    const q = normalize(searchQuery);
    if (q) {
      result = result.filter((ing) => normalize(ing.name).includes(q));
    }
    return result;
  }, [ingredients, activeCategory, searchQuery]);

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
    setEditCategory(item.category || "");
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
    setEditCategory("");
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
    setEditCategory("");
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
        category: "",
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
      // Look for an existing entry with the same name AND compatible unit family
      const existingIndex = prev.findIndex((ing) => {
        if (normalize(ing.name) !== nameKey) return false;
        const existingUnit = normalizeUnit(ing.unit);
        return existingUnit === unitRaw || unitsCompatible(existingUnit, unitRaw);
      });

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const existingQty = parseNumber(existing.quantity);
        const existingUnit = normalizeUnit(existing.unit);

        // Convert both to base, sum, then pick best display unit
        const existBase = toBaseQty(existingQty, existingUnit);
        const addBase = toBaseQty(qtyToAdd, unitRaw);

        let finalQty: number;
        let finalUnit: string;

        if (existBase && addBase && existBase.family === addBase.family) {
          const totalBase = existBase.base + addBase.base;
          const best = bestUnitForBase(totalBase, existBase.family);
          finalQty = best.qty;
          finalUnit = best.unit;
        } else {
          // Fallback: same-unit direct add
          finalQty = existingQty + qtyToAdd;
          finalUnit = unitRaw;
        }

        const updated: Ingredient = {
          ...existing,
          quantity: formatNumber(finalQty),
          unit: finalUnit,
          category: editCategory.trim(),
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
        category: editCategory.trim(),
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
              category: editCategory.trim(),
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
     Render: Grid Tile
  ========================================================= */
  const renderItem = ({ item }: { item: Ingredient }) => {
    const unitDisplay = normalizeUnit(item.unit);
    const qtyDisplay = item.quantity;
    const label = unitDisplay === "x" || unitDisplay === "unit"
      ? `${qtyDisplay}x`
      : `${qtyDisplay} ${item.unit}`;

    return (
      <TouchableOpacity
        style={styles.gridTile}
        activeOpacity={0.8}
        onPress={() => openEdit(item)}
      >
        <Image
          source={getIngredientImage(getBaseIngredient(item.name))}
          style={styles.gridTileImage}
          contentFit="contain"
        />
        <Text style={styles.gridTileQty} numberOfLines={1}>{label}</Text>
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

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#c98b92" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search ingredients..."
            placeholderTextColor="#ddb8b8"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#c98b92" />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterRow}
          style={styles.categoryScroll}
        >
          {/* "All" chip */}
          {(() => {
            const isActive = activeCategory === ALL_CATEGORY;
            return (
              <TouchableOpacity
                key="all"
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(ALL_CATEGORY)}
                activeOpacity={0.85}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>All</Text>
                {ingredients.length > 0 && (
                  <View style={[styles.categoryCountBadge, isActive && styles.categoryCountBadgeActive]}>
                    <Text style={[styles.categoryCountText, isActive && styles.categoryCountTextActive]}>
                      {ingredients.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* User category chips */}
          {userCategories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = ingredients.filter((i) => (i.category || "") === cat).length;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.85}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {toTitle(cat)}
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

        {/* INVENTORY GRID */}
        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={5}
          key="grid-5"
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="leaf-outline" size={40} color="#e0c4c4" />
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? "No results"
                  : activeCategory === ALL_CATEGORY
                  ? "No ingredients yet"
                  : `No ${toTitle(activeCategory)} items`}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery ? "Try a different search." : "Tap + to add one."}
              </Text>
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
              <TextInput
                value={editCategory}
                onChangeText={setEditCategory}
                style={styles.createInput}
                placeholder="e.g. Dairy, Meat, Snacks..."
                placeholderTextColor="#e0c4c4"
                autoCapitalize="words"
                onFocus={() => {
                  setShowSuggestions(false);
                  setShowMetricDropdown(false);
                }}
              />

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