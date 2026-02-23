import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/shoppingscreen.styles";

import { getIngredientImage, INGREDIENT_KEYS } from "../../src/ingredientImages";

/* =========================================================
   Types
========================================================= */
type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  checked?: boolean;
};

type PantryIngredient = {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category?: string;
  expiryDate?: string;
};

/* =========================================================
   Storage keys
========================================================= */
const SHOPPING_KEY = "kitchie.shopping.v1";
const PANTRY_KEY = "kitchie.ingredients.v1";
const STATS_KEY = "kitchie.stats.v1";

/* =========================================================
   Ingredient Variations
========================================================= */
const INGREDIENT_VARIATIONS: Record<string, string[]> = {
  "soy sauce": ["Sushi", "Light", "Dark"],
};

const getBaseIngredient = (name: string): string => {
  const n = name.trim().toLowerCase();
  const match = n.match(/^(.+?)\s*\(.*\)$/);
  return match ? match[1].trim() : n;
};

const isValidIngredient = (name: string): boolean => {
  const n = name.trim().toLowerCase();
  if (INGREDIENT_KEYS.includes(n)) return true;
  const base = getBaseIngredient(n);
  if (!INGREDIENT_KEYS.includes(base)) return false;
  const variations = INGREDIENT_VARIATIONS[base];
  if (!variations) return false;
  const varMatch = n.match(/\((.+)\)$/);
  if (!varMatch) return false;
  return variations.some((v) => v.toLowerCase() === varMatch[1].trim().toLowerCase());
};

/* =========================================================
   Metric Options
========================================================= */
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

const unitsCompatible = (a: string | undefined, b: string | undefined): boolean => {
  const infoA = UNIT_TO_BASE[normalizeUnit(a)];
  const infoB = UNIT_TO_BASE[normalizeUnit(b)];
  if (!infoA || !infoB) return false;
  return infoA.family === infoB.family;
};

const bestUnitForBase = (baseQty: number, family: UnitFamily): { qty: number; unit: string } => {
  if (family === "mass") {
    if (baseQty >= 1000) return { qty: Math.round((baseQty / 1000) * 100) / 100, unit: "kg" };
    return { qty: Math.round(baseQty * 100) / 100, unit: "g" };
  }
  if (family === "volume") {
    if (baseQty >= 1000) return { qty: Math.round((baseQty / 1000) * 100) / 100, unit: "l" };
    return { qty: Math.round(baseQty * 100) / 100, unit: "ml" };
  }
  return { qty: Math.round(baseQty * 100) / 100, unit: "x" };
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

/* =========================================================
   Component
========================================================= */
const ShoppingScreen: FC = () => {
  const router = useRouter();

  /* -----------------------------
     State
  ------------------------------ */
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("x");

  // Autocomplete + picker state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIngredientKey, setSelectedIngredientKey] = useState<string | null>(null);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const [pendingVariationKey, setPendingVariationKey] = useState<string | null>(null);

  /* -----------------------------
     Load data on focus
  ------------------------------ */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(SHOPPING_KEY);
          if (!alive) return;
          const data: ShoppingItem[] = raw ? JSON.parse(raw) : [];
          setItems(Array.isArray(data) ? data : []);
        } catch (e) {
          console.warn("Failed to load shopping list", e);
          if (!alive) return;
          setItems([]);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  /* -----------------------------
     Save data on change
  ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn("Failed to save shopping list", e);
      }
    })();
  }, [items]);

  /* -----------------------------
     Autocomplete suggestions
  ------------------------------ */
  const ingredientSuggestions = useMemo(() => {
    const q = normalize(editName);
    if (!q) return [];
    return INGREDIENT_KEYS.filter((k) => k.includes(q)).slice(0, 6);
  }, [editName]);

  /* -----------------------------
     Modal handlers
  ------------------------------ */
  const resetModalState = () => {
    setSelectedItem(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("x");
    setSelectedIngredientKey(null);
    setShowSuggestions(false);
    setShowMetricDropdown(false);
    setShowVariationPicker(false);
    setPendingVariationKey(null);
  };

  const openAdd = () => {
    resetModalState();
    setModalVisible(true);
  };

  const openEdit = (item: ShoppingItem) => {
    resetModalState();
    setSelectedItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit || "x");
    setSelectedIngredientKey(item.name);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetModalState();
  };

  const isEditMode = !!selectedItem;

  /* -----------------------------
     CRUD operations
  ------------------------------ */
  const addItem = () => {
    const candidate = selectedIngredientKey ?? normalize(editName);
    const unitRaw = normalizeUnit(editUnit);
    const qtyToAdd = parseNumber(editQuantity);

    if (!isValidIngredient(candidate)) {
      Alert.alert("Pick from the list", "Please select an ingredient from suggestions.");
      return;
    }
    if (qtyToAdd <= 0) {
      Alert.alert("Invalid quantity", "Please enter a valid quantity.");
      return;
    }

    const nameKey = normalize(candidate);

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (normalize(item.name) !== nameKey) return false;
        return normalizeUnit(item.unit) === unitRaw || unitsCompatible(item.unit, unitRaw);
      });

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const existingQty = parseNumber(existing.quantity);
        const existingUnit = normalizeUnit(existing.unit);
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
          finalQty = existingQty + qtyToAdd;
          finalUnit = unitRaw;
        }

        const copy = [...prev];
        copy[existingIndex] = { ...existing, quantity: formatNumber(finalQty), unit: finalUnit };
        return copy;
      }

      return [...prev, {
        id: Date.now().toString(),
        name: candidate,
        quantity: formatNumber(qtyToAdd),
        unit: unitRaw,
        checked: false,
      }];
    });

    closeModal();
  };

  const saveEdit = () => {
    if (!selectedItem) return;
    const candidate = selectedIngredientKey ?? normalize(editName);
    if (!isValidIngredient(candidate)) {
      Alert.alert("Pick from the list", "Please select an ingredient from suggestions.");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? { ...item, name: candidate, quantity: editQuantity.trim() || item.quantity, unit: normalizeUnit(editUnit) }
          : item
      )
    );
    closeModal();
  };

  const deleteItem = () => {
    if (!selectedItem) return;
    setItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
    closeModal();
  };

  const toggleChecked = (id: string) => {
    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const deleteChecked = () => {
    Alert.alert("Delete checked items?", `Remove ${checkedCount} checked item${checkedCount > 1 ? "s" : ""} from your list?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setItems((prev) => prev.filter((item) => !item.checked)) },
    ]);
  };

  const deleteAll = () => {
    Alert.alert("Delete entire list?", "This will remove all items from your shopping list.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete All", style: "destructive", onPress: () => setItems([]) },
    ]);
  };

  const buySelected = () => {
    const checkedItems = items.filter((item) => item.checked);
    if (checkedItems.length === 0) return;
    Alert.alert("Buy selected items?", `This will add ${checkedItems.length} item${checkedItems.length > 1 ? "s" : ""} to your inventory.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Buy", style: "default", onPress: () => buyItemsConfirmed(checkedItems) },
    ]);
  };

  const buyAll = () => {
    if (items.length === 0) return;
    Alert.alert("Buy all items?", `This will add all ${items.length} item${items.length > 1 ? "s" : ""} to your inventory.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Buy All", style: "default", onPress: () => buyItemsConfirmed(items) },
    ]);
  };

  /* -----------------------------
     Buy → unit-aware pantry merge
  ------------------------------ */
  const buyItemsConfirmed = async (itemsToBuy: ShoppingItem[]) => {
    try {
      const pantryRaw = await AsyncStorage.getItem(PANTRY_KEY);
      let pantry: PantryIngredient[] = pantryRaw ? JSON.parse(pantryRaw) : [];

      for (const item of itemsToBuy) {
        const nameKey = normalize(item.name);
        const unitRaw = normalizeUnit(item.unit);
        const addQty = parseNumber(item.quantity);

        const existingIndex = pantry.findIndex((p) => {
          if (normalize(p.name) !== nameKey) return false;
          return normalizeUnit(p.unit) === unitRaw || unitsCompatible(p.unit, unitRaw);
        });

        if (existingIndex !== -1) {
          const existing = pantry[existingIndex];
          const existingQty = parseNumber(existing.quantity);
          const existingUnit = normalizeUnit(existing.unit);
          const existBase = toBaseQty(existingQty, existingUnit);
          const addBase = toBaseQty(addQty, unitRaw);

          let finalQty: number;
          let finalUnit: string;

          if (existBase && addBase && existBase.family === addBase.family) {
            const totalBase = existBase.base + addBase.base;
            const best = bestUnitForBase(totalBase, existBase.family);
            finalQty = best.qty;
            finalUnit = best.unit;
          } else {
            finalQty = existingQty + addQty;
            finalUnit = unitRaw;
          }

          pantry[existingIndex] = { ...existing, quantity: formatNumber(finalQty), unit: finalUnit };
        } else {
          pantry.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: item.name,
            quantity: item.quantity,
            unit: unitRaw,
          });
        }
      }

      await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(pantry));

      const itemIds = new Set(itemsToBuy.map((i) => i.id));
      setItems((prev) => prev.filter((item) => !itemIds.has(item.id)));

      try {
        const raw = await AsyncStorage.getItem(STATS_KEY);
        const stats = raw ? JSON.parse(raw) : { recipesCooked: 0, ingredientsBought: 0 };
        stats.ingredientsBought = (stats.ingredientsBought || 0) + itemsToBuy.length;
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
      } catch (_) {}

      Alert.alert("Done!", `${itemsToBuy.length} item${itemsToBuy.length > 1 ? "s" : ""} added to your inventory.`);
    } catch (e) {
      console.warn("Failed to buy items", e);
      Alert.alert("Error", "Could not complete purchase.");
    }
  };

  /* -----------------------------
     Render item
  ------------------------------ */
  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, item.checked && styles.itemCardChecked]}
      activeOpacity={0.8}
      onPress={() => toggleChecked(item.id)}
      onLongPress={() => openEdit(item)}
    >
      <View style={styles.itemLeftRow}>
        <TouchableOpacity
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => toggleChecked(item.id)}
          activeOpacity={0.8}
        >
          {item.checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>

        <Image source={getIngredientImage(getBaseIngredient(item.name))} style={styles.itemImage} contentFit="contain" />

        <View style={styles.itemTextWrap}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
            {toTitle(item.name)}
          </Text>
          <Text style={[styles.itemSub, item.checked && styles.itemSubChecked]}>
            {item.quantity} {item.unit}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.editIconWrap} onPress={() => openEdit(item)} activeOpacity={0.8}>
        <Ionicons name="pencil" size={16} color="#b7747c" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const checkedCount = items.filter((i) => i.checked).length;

  /* =========================================================
     Render
  ========================================================= */
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color="#f29f9b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping List</Text>
          <TouchableOpacity onPress={openAdd} style={styles.addButton} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#f29f9b" />
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        {items.length > 0 && checkedCount > 0 && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.buyButton} onPress={buySelected} activeOpacity={0.85}>
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Buy ({checkedCount})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buyAllButton} onPress={buyAll} activeOpacity={0.85}>
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Buy All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={deleteChecked} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Delete ({checkedCount})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteAllButton} onPress={deleteAll} activeOpacity={0.85}>
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Delete All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySub}>Tap + to add items to your shopping list.</Text>
            </View>
          }
        />

        {/* MODAL */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal}>
            <View />
          </Pressable>

          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{isEditMode ? "Edit Item" : "Add Item"}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.sheetClose} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#b7747c" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={() => setShowMetricDropdown(false)}>
              {/* Name */}
              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                value={editName}
                onChangeText={(t) => { setEditName(t); setSelectedIngredientKey(null); setShowSuggestions(true); }}
                style={styles.modalInput}
                placeholder="Search ingredient..."
                placeholderTextColor="#e0c4c4"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => { setShowSuggestions(true); setShowMetricDropdown(false); }}
              />

              {/* Suggestions */}
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
              <View style={{ flexDirection: "row", gap: 10, zIndex: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { marginTop: 12 }]}>Amount</Text>
                  <TextInput
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#e0c4c4"
                    keyboardType="numeric"
                    onFocus={() => { setShowSuggestions(false); setShowMetricDropdown(false); }}
                  />
                </View>
                <View style={{ width: 100, position: "relative", zIndex: 10 }}>
                  <Text style={[styles.modalLabel, { marginTop: 12 }]}>Metric</Text>
                  <TouchableOpacity
                    style={[styles.modalInput, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 8 }]}
                    activeOpacity={0.85}
                    onPress={() => { setShowMetricDropdown((p) => !p); setShowSuggestions(false); }}
                  >
                    <Text style={{ color: "#b7747c", fontWeight: "800", fontSize: 14 }}>
                      {METRIC_OPTIONS.find((m) => m.key === editUnit)?.label || "x"}
                    </Text>
                    <Ionicons name={showMetricDropdown ? "chevron-up" : "chevron-down"} size={16} color="#b7747c" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtonsRow}>
                {isEditMode ? (
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={deleteItem} activeOpacity={0.85}>
                    <Text style={styles.modalButtonDangerText}>Delete</Text>
                  </TouchableOpacity>
                ) : <View />}
                <View style={styles.modalButtonsRight}>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={closeModal} activeOpacity={0.85}>
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={isEditMode ? saveEdit : addItem} activeOpacity={0.9}>
                    <Text style={styles.modalButtonPrimaryText}>{isEditMode ? "Save" : "Add"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* METRIC PICKER OVERLAY */}
            {showMetricDropdown && (
              <Pressable
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", alignItems: "center", zIndex: 100, borderRadius: 18 }}
                onPress={() => setShowMetricDropdown(false)}
              >
                <View style={{ width: 220, maxHeight: 360, borderRadius: 18, backgroundColor: "#ffe9dc", padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 }} onStartShouldSetResponder={() => true}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#b7747c", textAlign: "center", paddingVertical: 10 }}>Select Metric</Text>
                  <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    {METRIC_OPTIONS.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 4, marginBottom: 4, borderRadius: 12, backgroundColor: editUnit === m.key ? "rgba(242,159,155,0.25)" : "rgba(255,255,255,0.65)" }}
                        activeOpacity={0.85}
                        onPress={() => { setEditUnit(m.key); setShowMetricDropdown(false); }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "800", color: editUnit === m.key ? "#f29f9b" : "#b7747c" }}>{m.label}</Text>
                        {editUnit === m.key && <Ionicons name="checkmark" size={18} color="#f29f9b" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            )}

            {/* VARIATION PICKER OVERLAY */}
            {showVariationPicker && pendingVariationKey && (
              <Pressable
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", alignItems: "center", zIndex: 100, borderRadius: 18 }}
                onPress={() => { setShowVariationPicker(false); setPendingVariationKey(null); }}
              >
                <View style={{ width: 260, maxHeight: 400, borderRadius: 18, backgroundColor: "#ffe9dc", padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 }} onStartShouldSetResponder={() => true}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#b7747c", textAlign: "center", paddingVertical: 10 }}>Select Variation</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#c98b92", textAlign: "center", marginBottom: 8 }}>{toTitle(pendingVariationKey)}</Text>
                  <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 4, marginBottom: 4, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.65)" }}
                      activeOpacity={0.85}
                      onPress={() => { setEditName(toTitle(pendingVariationKey)); setSelectedIngredientKey(pendingVariationKey); setShowVariationPicker(false); setPendingVariationKey(null); }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#b7747c" }}>Regular</Text>
                    </TouchableOpacity>
                    {(INGREDIENT_VARIATIONS[pendingVariationKey] ?? []).map((variation) => {
                      const fullName = `${pendingVariationKey} (${variation.toLowerCase()})`;
                      return (
                        <TouchableOpacity
                          key={variation}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 4, marginBottom: 4, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.65)" }}
                          activeOpacity={0.85}
                          onPress={() => { setEditName(toTitle(fullName)); setSelectedIngredientKey(fullName); setShowVariationPicker(false); setPendingVariationKey(null); }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: "800", color: "#b7747c" }}>{variation}</Text>
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

export default ShoppingScreen;

/* =========================================================
   Helpers
========================================================= */
function toTitle(s: string) {
  return s.trim().split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}
