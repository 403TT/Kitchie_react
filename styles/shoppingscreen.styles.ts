import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  /* =========================
   * LAYOUT / SCREEN
   * ========================= */
  safeArea: {
    flex: 1,
    backgroundColor: "#fff5f0",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* =========================
   * HEADER (matches recipe screen)
   * ========================= */
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f29f9b",
    letterSpacing: 0.3,
  },
  addButton: {
    position: "absolute",
    right: 0,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
   * ACTION BUTTONS ROW
   * ========================= */
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#3CB371",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  buyAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#2E8B57",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(183,116,124,0.85)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  deleteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  /* =========================
   * LIST
   * ========================= */
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },

  /* =========================
   * ITEM CARD
   * ========================= */
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.70)",
    borderRadius: 16,
  },
  itemCardChecked: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  itemLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },

  /* Checkbox */
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#f29f9b",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#f29f9b",
    borderColor: "#f29f9b",
  },

  /* Image */
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },

  /* Text */
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#b7747c",
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  itemSub: {
    fontSize: 12,
    color: "#c98b92",
    fontWeight: "700",
    marginTop: 2,
  },
  itemSubChecked: {
    opacity: 0.5,
  },

  /* Edit icon */
  editIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
   * EMPTY STATE
   * ========================= */
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: "#b7747c",
    fontWeight: "900",
    fontSize: 16,
  },
  emptySub: {
    marginTop: 8,
    color: "#b7747c",
    opacity: 0.8,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },

  /* =========================
   * MODAL
   * ========================= */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 120,
    borderRadius: 18,
    backgroundColor: "#ffe9dc",
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#b7747c",
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Labels + inputs */
  modalLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b7747c",
    marginBottom: 6,
  },
  modalInput: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    color: "#b7747c",
    fontWeight: "800",
  },

  /* Suggestions */
  suggestionBox: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(183,116,124,0.18)",
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(183,116,124,0.10)",
  },
  suggestionText: {
    color: "#b7747c",
    fontWeight: "900",
  },

  /* Buttons */
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    alignItems: "center",
  },
  modalButtonsRight: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modalButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  modalButtonPrimary: {
    backgroundColor: "#f29f9b",
  },
  modalButtonDanger: {
    backgroundColor: "#ff6b6b",
  },
  modalButtonSecondaryText: {
    color: "#b7747c",
    fontWeight: "900",
  },
  modalButtonPrimaryText: {
    color: "#ffe9dc",
    fontWeight: "900",
  },
  modalButtonDangerText: {
    color: "#fff",
    fontWeight: "900",
  },
});
