import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search options..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <Text style={styles.searchIcon}>🔍</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },

  searchIcon: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
});
