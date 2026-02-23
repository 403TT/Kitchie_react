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
   * HEADER (MATCH RECIPESCREEN EXACTLY)
   * ========================= */
  headerRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 4,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f29f9b",
    letterSpacing: 0.3,
  },

  /* =========================
   * TEXT
   * ========================= */
  subtitle: {
    fontSize: 14,
    color: "#b7867c",
    marginBottom: 8,
  },

  /* =========================
   * SEARCH BAR
   * ========================= */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.65)",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#b7747c",
    fontWeight: "700",
    fontSize: 14,
  },

  /* =========================
   * CATEGORY FILTER (horizontal)
   * ========================= */
  categoryScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  categoryFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.65)",
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: "#f29f9b",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#b7747c",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  categoryCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(183,116,124,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  categoryCountBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#b7747c",
  },
  categoryCountTextActive: {
    color: "#fff",
  },

  /* =========================
   * GRID
   * ========================= */
  gridContent: {
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },

  /* =========================
   * GRID TILE
   * ========================= */
  gridTile: {
    width: "18%",
    aspectRatio: 0.78,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  gridTileImage: {
    width: "72%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 3,
  },
  gridTileQty: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7a4d45",
    textAlign: "center",
  },

  /* =========================
   * EXPIRY BADGES
   * ========================= */
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expiryBadgeOk: {
    backgroundColor: "rgba(85,139,47,0.10)",
  },
  expiryBadgeSoon: {
    backgroundColor: "rgba(230,81,0,0.10)",
  },
  expiryBadgeExpired: {
    backgroundColor: "rgba(211,47,47,0.10)",
  },
  expiryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  expiryTextOk: {
    color: "#558b2f",
  },
  expiryTextSoon: {
    color: "#e65100",
  },
  expiryTextExpired: {
    color: "#d32f2f",
  },

  /* =========================
   * EMPTY STATE
   * ========================= */
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#c9a09a",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: "#d4b5b0",
  },

  /* =========================
   * MODAL (MATCH RECIPE MODAL)
   * ========================= */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  invModalCard: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 100,
    maxHeight: "75%",
    borderRadius: 18,
    backgroundColor: "#ffe9dc",
    padding: 14,
  },

  createHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  createTitle: {
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

  createLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b7747c",
    marginBottom: 6,
  },
  createInput: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    color: "#b7747c",
    fontWeight: "800",
  },

  /* =========================
   * INPUT ROW (Quantity + Unit side by side)
   * ========================= */
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputRowItem: {
    flex: 1,
  },
  inputRowItemSmall: {
    width: 100,
  },

  /* =========================
   * CATEGORY PICKER (in modal)
   * ========================= */
  categoryPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  categoryPickActive: {
    backgroundColor: "#f29f9b",
  },
  categoryPickText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b7747c",
  },
  categoryPickTextActive: {
    color: "#fff",
  },

  /* =========================
   * EXPIRY DATE INPUT
   * ========================= */
  expiryInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    fontWeight: "700",
    marginTop: 4,
    marginLeft: 4,
  },

  /* =========================
   * INGREDIENT SUGGESTIONS
   * ========================= */
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

  /* =========================
   * MODAL BUTTONS
   * ========================= */
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
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
    color: "#fffffffa",
    fontWeight: "900",
  },
  modalButtonDangerText: {
    color: "#fff",
    fontWeight: "900",
  },
});