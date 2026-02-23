import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { FC, useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/shoppingscreen.styles";

import { getIngredientImage } from "../../src/ingredientImages";

/** Get the base ingredient key from a potentially varianted name */
const getBaseIngredient = (name: string): string => {
  const match = name.match(/^(.+?)\s*\(.*\)$/);
  return match ? match[1].trim().toLowerCase() : name.toLowerCase();
};

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
};

/* =========================================================
   Storage keys
========================================================= */
const SHOPPING_KEY = "kitchie.shopping.v1";
const PANTRY_KEY = "kitchie.ingredients.v1";
const STATS_KEY = "kitchie.stats.v1";

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
  const [editUnit, setEditUnit] = useState("");

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

      return () => {
        alive = false;
      };
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
     Modal handlers
  ------------------------------ */
  const openAdd = () => {
    setSelectedItem(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("x");
    setModalVisible(true);
  };

  const openEdit = (item: ShoppingItem) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit || "x");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("");
  };

  const isEditMode = !!selectedItem;

  /* -----------------------------
     CRUD operations
  ------------------------------ */
  const addItem = () => {
    const nameRaw = editName.trim();
    const unitRaw = (editUnit.trim() || "x").toLowerCase();
    const qtyToAdd = parseNumber(editQuantity);

    if (!nameRaw || qtyToAdd <= 0) return;

    const nameKey = normalize(nameRaw);

    setItems((prev) => {
      // Check if item already exists (merge quantities)
      const existingIndex = prev.findIndex(
        (item) =>
          normalize(item.name) === nameKey && (item.unit?.toLowerCase() || "x") === unitRaw
      );

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const existingQty = parseNumber(existing.quantity);
        const nextQty = existingQty + qtyToAdd;

        const updated: ShoppingItem = {
          ...existing,
          quantity: formatNumber(nextQty),
          unit: unitRaw,
        };

        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      }

      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: nameRaw,
        quantity: formatNumber(qtyToAdd),
        unit: unitRaw,
        checked: false,
      };

      return [...prev, newItem];
    });

    closeModal();
  };

  const saveEdit = () => {
    if (!selectedItem) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              name: editName.trim() || item.name,
              quantity: editQuantity.trim() || item.quantity,
              unit: (editUnit.trim() || "x").toLowerCase(),
            }
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
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const deleteChecked = () => {
    Alert.alert(
      "Delete checked items?",
      `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''} from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => setItems((prev) => prev.filter((item) => !item.checked)) },
      ]
    );
  };

  const deleteAll = () => {
    Alert.alert(
      "Delete entire list?",
      "This will remove all items from your shopping list.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete All", style: "destructive", onPress: () => setItems([]) },
      ]
    );
  };

  const buySelected = () => {
    const checkedItems = items.filter((item) => item.checked);
    
    if (checkedItems.length === 0) return;

    Alert.alert(
      "Buy selected items?",
      `This will add ${checkedItems.length} item${checkedItems.length > 1 ? 's' : ''} to your inventory and remove them from the shopping list.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", style: "default", onPress: () => buyItemsConfirmed(checkedItems) },
      ]
    );
  };

  const buyAll = () => {
    if (items.length === 0) return;

    Alert.alert(
      "Buy all items?",
      `This will add all ${items.length} item${items.length > 1 ? 's' : ''} to your inventory and clear your shopping list.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy All", style: "default", onPress: () => buyItemsConfirmed(items) },
      ]
    );
  };

  const buyItemsConfirmed = async (itemsToBuy: ShoppingItem[]) => {
    try {
      // Get current pantry
      const pantryRaw = await AsyncStorage.getItem(PANTRY_KEY);
      let pantry: PantryIngredient[] = pantryRaw ? JSON.parse(pantryRaw) : [];

      // Add each item to pantry
      for (const item of itemsToBuy) {
        const nameKey = normalize(item.name);
        const unitRaw = (item.unit || "x").toLowerCase();

        const existingIndex = pantry.findIndex(
          (p) =>
            normalize(p.name) === nameKey && (p.unit?.toLowerCase() || "x") === unitRaw
        );

        if (existingIndex !== -1) {
          // Update quantity
          const existing = pantry[existingIndex];
          const existingQty = parseNumber(existing.quantity);
          const addQty = parseNumber(item.quantity);
          const nextQty = existingQty + addQty;

          pantry[existingIndex] = {
            ...existing,
            quantity: formatNumber(nextQty),
          };
        } else {
          // Add new item
          const newItem: PantryIngredient = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: item.name,
            quantity: item.quantity,
            unit: unitRaw,
          };
          pantry.push(newItem);
        }
      }

      // Save updated pantry
      await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(pantry));

      // Remove bought items from shopping list
      const itemIds = new Set(itemsToBuy.map((i) => i.id));
      setItems((prev) => prev.filter((item) => !itemIds.has(item.id)));

      // Increment ingredients bought stat
      try {
        const raw = await AsyncStorage.getItem(STATS_KEY);
        const stats = raw ? JSON.parse(raw) : { recipesCooked: 0, ingredientsBought: 0 };
        stats.ingredientsBought = (stats.ingredientsBought || 0) + itemsToBuy.length;
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
      } catch (_) {}

      Alert.alert("Done!", `${itemsToBuy.length} item${itemsToBuy.length > 1 ? 's' : ''} added to your inventory.`);
    } catch (e) {
      console.warn("Failed to buy items", e);
      Alert.alert("Error", "Could not complete purchase.");
    }
  };

  /* -----------------------------
     Render item
  ------------------------------ */
  const renderItem = ({ item }: { item: ShoppingItem }) => {
    return (
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

          <Image source={getIngredientImage(getBaseIngredient(item.name))} style={styles.itemImage} />

          <View style={styles.itemTextWrap}>
            <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
              {toTitle(item.name)}
            </Text>
            <Text style={[styles.itemSub, item.checked && styles.itemSubChecked]}>
              {item.quantity} {item.unit}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editIconWrap}
          onPress={() => openEdit(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={16} color="#b7747c" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  /* -----------------------------
     Counts
  ------------------------------ */
  const checkedCount = items.filter((i) => i.checked).length;

  /* -----------------------------
     Render
  ------------------------------ */
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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

          <Text style={styles.headerTitle}>Shopping List</Text>

          <TouchableOpacity onPress={openAdd} style={styles.addButton} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#f29f9b" />
          </TouchableOpacity>
        </View>

        {/* Action buttons row */}
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
              <Text style={styles.emptySub}>
                Tap + to add items, or add missing ingredients from Recipes.
              </Text>
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
              <Text style={styles.modalTitle}>
                {isEditMode ? "Edit Item" : "Add Item"}
              </Text>

              <TouchableOpacity onPress={closeModal} style={styles.sheetClose} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#b7747c" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.modalInput}
              placeholder="e.g. Milk"
              placeholderTextColor="#e0c4c4"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Quantity</Text>
            <TextInput
              value={editQuantity}
              onChangeText={setEditQuantity}
              style={styles.modalInput}
              placeholder="Amount"
              placeholderTextColor="#e0c4c4"
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Unit</Text>
            <TextInput
              value={editUnit}
              onChangeText={setEditUnit}
              style={styles.modalInput}
              placeholder="x"
              placeholderTextColor="#e0c4c4"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonsRow}>
              {isEditMode ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDanger]}
                  onPress={deleteItem}
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
                  onPress={closeModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={isEditMode ? saveEdit : addItem}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {isEditMode ? "Save" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  return s
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}
