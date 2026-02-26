import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

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
        placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
    margin: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
  },

  searchIcon: {
    fontSize: ResponsiveTheme.fontSize.md,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
});
