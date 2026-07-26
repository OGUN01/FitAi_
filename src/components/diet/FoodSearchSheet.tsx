/**
 * FoodSearchSheet - Offline-first food name search.
 *
 * Queries the on-device SQLite food database (sqliteFood.searchByName) when
 * the DB is ready, so the user can log a packaged product by name without a
 * barcode scan and without a network round-trip. Falls back to the static
 * Indian food database (indianFoodDatabase) for common dishes, so there is
 * always something to show even before the offline DB is downloaded.
 *
 * On select, calls onSelect with a normalised result that the parent maps to
 * a LogMealScanResult (type "barcode") so the existing LogMealModal handles
 * portion entry + macro calculation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from "../../theme/aurora-tokens";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import { sqliteFood, type SQLiteFoodResult } from "../../services/sqliteFood";
import { INDIAN_FOOD_DATABASE, type IndianFoodData } from "../../data/indianFoodDatabase";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";

/** Normalised result handed back to the parent. */
export interface FoodSearchHit {
  /** Stable key for FlatList */
  key: string;
  /** Display name */
  name: string;
  /** Brand or region subtitle (may be empty) */
  subtitle?: string;
  /** per-100g macros (calories always required; others 0 when missing) */
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
  /** "sqlite" (offline packaged DB) | "indian" (curated dish DB) */
  source: "sqlite" | "indian";
  /** Barcode when source === "sqlite" (used to dedupe against scan cache) */
  barcode?: string;
  /** Nutriscore grade a-e when available */
  nutriScore?: string;
  /** Nova group 1-4 when available */
  novaGroup?: number;
  /** Image URL when available */
  imageUrl?: string;
}

interface FoodSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (hit: FoodSearchHit) => void;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

/** Map an Indian-food DB row to a FoodSearchHit. */
function fromIndian(entry: IndianFoodData, key: string): FoodSearchHit {
  const n = entry.nutritionPer100g;
  return {
    key: `indian:${key}`,
    name: entry.name,
    subtitle: entry.hindiName ? `${entry.hindiName} · ${entry.region}` : entry.region,
    per100g: {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      sugar: n.sugar,
      sodium: n.sodium,
    },
    source: "indian",
  };
}

/** Map a SQLite products row to a FoodSearchHit. */
function fromSQLite(row: SQLiteFoodResult): FoodSearchHit {
  return {
    key: `sqlite:${row.code}`,
    name: row.product_name ?? "Unknown product",
    subtitle: row.brands ?? undefined,
    barcode: row.code,
    per100g: {
      calories: row.energy_kcal_100g ?? 0,
      protein: row.proteins_100g ?? 0,
      carbs: row.carbohydrates_100g ?? 0,
      fat: row.fat_100g ?? 0,
      fiber: row.fiber_100g ?? 0,
      sugar: row.sugars_100g ?? undefined,
      sodium: row.sodium_100g ?? undefined,
    },
    source: "sqlite",
    nutriScore: row.nutriscore_grade ?? undefined,
    novaGroup: row.nova_group ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

export const FoodSearchSheet: React.FC<FoodSearchSheetProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(sqliteFood.isDatabaseReady());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Refresh readiness flag when the sheet opens (download may have completed).
  useEffect(() => {
    if (visible) {
      sqliteFood.ensureDbReady().then(() => {
        setDbReady(sqliteFood.isDatabaseReady());
      });
      // Reset query + focus for a fresh search session.
      setQuery("");
      setHits([]);
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Debounced search — runs SQLite LIKE + Indian DB filter together.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    const lower = q.toLowerCase();

    // 1. Static Indian food DB — always available (curated ~200 dishes).
    const indianMatches: FoodSearchHit[] = [];
    for (const [key, entry] of Object.entries(INDIAN_FOOD_DATABASE)) {
      const name = entry.name.toLowerCase();
      const hindi = entry.hindiName ?? "";
      const regional = entry.regionalName ?? "";
      if (
        name.includes(lower) ||
        hindi.includes(q) ||
        regional.toLowerCase().includes(lower)
      ) {
        indianMatches.push(fromIndian(entry, key));
      }
    }

    // 2. Offline SQLite DB (millions of packaged products) when ready.
    let sqliteMatches: FoodSearchHit[] = [];
    if (sqliteFood.isDatabaseReady()) {
      try {
        const rows = await sqliteFood.searchByName(q, 40);
        sqliteMatches = rows.map(fromSQLite);
      } catch (err) {
        // Non-fatal — the Indian DB still returns results.
        console.error("[FoodSearchSheet] SQLite search failed:", err);
      }
    }

    // Merge: Indian dishes first (curated, accurate), then packaged products.
    // Dedupe by name (case-insensitive) so the same item doesn't appear twice.
    const seen = new Set<string>();
    const merged: FoodSearchHit[] = [];
    for (const hit of [...indianMatches, ...sqliteMatches]) {
      const k = hit.name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(hit);
      }
    }
    setHits(merged);
    setLoading(false);
  }, []);

  const handleSelect = useCallback(
    (hit: FoodSearchHit) => {
      onSelect(hit);
      setQuery("");
      setHits([]);
    },
    [onSelect],
  );

  const resultsFooter = useMemo(() => {
    if (query.trim().length < MIN_QUERY) {
      return dbReady
        ? "Search packaged products + Indian dishes"
        : "Indian dishes available · download offline DB for millions more";
    }
    if (!loading && hits.length === 0) {
      return "No matches — try a shorter or different name";
    }
    return "";
  }, [query, loading, hits.length, dbReady]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={rf(fontSize.lg)}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search food by name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => setQuery("")}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.clearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons
                    name="close-circle"
                    size={rf(fontSize.md)}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close food search"
            >
              <Ionicons name="close" size={rf(fontSize.xl)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status row */}
          {(loading || resultsFooter !== "") && (
            <View style={styles.statusRow}>
              {loading ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.statusText} numberOfLines={1}>Searching…</Text>
                </>
              ) : (
                <Text
                  style={styles.statusText}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {resultsFooter}
                </Text>
              )}
            </View>
          )}

          {/* Results */}
          <FlatList
            data={hits}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <AnimatedPressable
                onPress={() => handleSelect(item)}
                scaleValue={0.98}
                hapticFeedback
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
              >
                <GlassCard elevation={2} style={styles.card} padding="sm" borderRadius="lg">
                  <View style={styles.row}>
                    <View style={[styles.sourceTag, item.source === "sqlite" ? styles.sqliteTag : styles.indianTag]}>
                      <Text style={styles.sourceTagText} numberOfLines={1}>
                        {item.source === "sqlite" ? "Packaged" : "Dish"}
                      </Text>
                    </View>
                    <View style={styles.nameWrap}>
                      <Text
                        style={styles.name}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {item.name}
                      </Text>
                      {item.subtitle ? (
                        <Text
                          style={styles.subtitle}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.calsWrap}>
                      <Text style={styles.cals} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {Math.round(item.per100g.calories)}
                      </Text>
                      <Text
                        style={styles.calsUnit}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        kcal/100g
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </AnimatedPressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: rbr(28),
    borderTopRightRadius: rbr(28),
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: rh(48),
    gap: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: rf(fontSize.md),
    padding: 0,
  },
  // 44px touch floor for icon-only buttons (icons themselves are ~18-20px).
  clearBtn: {
    minWidth: Math.max(rw(44), 44),
    minHeight: Math.max(rw(44), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    minWidth: Math.max(rw(44), 44),
    minHeight: Math.max(rw(44), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: rf(fontSize.sm),
  },
  listContent: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  card: {
    marginHorizontal: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sourceTag: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: borderRadius.full,
  },
  sqliteTag: {
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW),
  },
  indianTag: {
    backgroundColor: colors.warningTint,
  },
  sourceTagText: {
    color: colors.textSecondary,
    fontSize: rf(fontSize.micro),
    fontWeight: "600",
    textTransform: "uppercase",
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: rf(fontSize.md),
    fontWeight: "600",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: rf(fontSize.sm),
    marginTop: 2,
  },
  calsWrap: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  cals: {
    color: colors.text,
    fontSize: rf(fontSize.lg),
    fontWeight: "700",
  },
  calsUnit: {
    color: colors.textSecondary,
    fontSize: rf(fontSize.micro),
  },
});

export default FoodSearchSheet;
