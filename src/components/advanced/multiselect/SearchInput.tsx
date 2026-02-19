import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { THEME } from "../../ui";

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
        placeholderTextColor={THEME.colors.textMuted}
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
    margin: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  searchIcon: {
    fontSize: THEME.fontSize.md,
    marginLeft: THEME.spacing.sm,
  },
});
