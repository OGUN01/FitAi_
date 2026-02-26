import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import type { ScannedProduct } from "../../../services/barcodeService";

interface ProductHeaderProps {
  product: ScannedProduct;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => (
  <View style={styles.headerContainer}>
    {product.additionalInfo?.imageUrl && (
      <Image
        source={{ uri: product.additionalInfo.imageUrl }}
        style={styles.productImage}
        resizeMode="contain"
      />
    )}
    <View style={styles.productInfo}>
      <Text style={styles.productName}>{product.name}</Text>
      {product.brand && (
        <Text style={styles.productBrand}>{product.brand}</Text>
      )}
      {product.category && (
        <Text style={styles.productCategory}>{product.category}</Text>
      )}
      <Text style={styles.barcodeText}>Barcode: {product.barcode}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    padding: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginRight: ResponsiveTheme.spacing.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  productBrand: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  productCategory: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  barcodeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: "monospace",
  },
});
