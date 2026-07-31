/**
 * SearchSheet — searchable bottom-sheet picker (S6 "Rhythm" country).
 *
 * Replaces the 7-country chip row with a tappable field that opens a modal
 * sheet: a search input + a scrollable list of options filtered as you type.
 * Tap to select → closes. Backdrop dismiss. Keyboard appears only here (one
 * of the few places a keyboard is justified — searching a long list).
 *
 * Pure presentation; the parent owns the value + options + onSelect.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Pressable,
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";

export interface SearchSheetOption {
  id: string;
  label: string;
}

export interface SearchSheetProps {
  options: SearchSheetOption[];
  value?: string;
  onSelect: (id: string) => void;
  /** The tappable field's label. */
  fieldLabel: string;
  /** Placeholder shown when no value. */
  placeholder?: string;
  testID?: string;
}

export const SearchSheet: React.FC<SearchSheetProps> = ({
  options,
  value,
  onSelect,
  fieldLabel,
  placeholder = "Select…",
  testID,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(
    () => options.find((o) => o.id === value)?.label ?? "",
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
      setQuery("");
    },
    [onSelect],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={fieldLabel}
        testID={testID}
      >
        <Text style={styles.fieldLabel}>{fieldLabel}</Text>
        <View style={styles.fieldRow}>
          <Text
            style={[styles.fieldValue, !selectedLabel && styles.fieldPlaceholder]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.text.tertiary} />
        </View>
        <View style={styles.underline} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetWrap}
          >
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>{fieldLabel}</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={colors.text.tertiary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search…"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.searchInput}
                  autoFocus
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                  </Pressable>
                ) : null}
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(o) => o.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelect(item.id)}
                    style={[
                      styles.option,
                      item.id === value && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        item.id === value && styles.optionLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.id === value ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary.DEFAULT} />
                    ) : null}
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                style={styles.list}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    paddingTop: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  fieldValue: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.text.primary,
  },
  fieldPlaceholder: {
    color: colors.text.tertiary,
  },
  underline: {
    height: 1,
    width: "100%",
    backgroundColor: colors.text.tertiary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: surface[2],
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: colors.text.tertiary,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: typography.variants.sectionTitle.fontFamily,
    fontSize: typography.variants.sectionTitle.fontSize,
    lineHeight: typography.variants.sectionTitle.lineHeight,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.text.primary,
    padding: 0,
  },
  list: {},
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  optionSelected: {},
  optionLabel: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.text.primary,
  },
  sep: {
    height: 1,
    backgroundColor: border.subtle,
  },
});
