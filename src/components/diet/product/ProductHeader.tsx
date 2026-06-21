import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import type { ScannedProduct } from "../../../services/barcodeService";

interface ProductHeaderProps {
  product: ScannedProduct;
}

const getProductMetaLabel = (product: ScannedProduct): string =>
  product.source === "vision-label"
    ? "Source: Label scan"
    : `Barcode: ${product.barcode}`;

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
      <Text style={styles.barcodeText}>{getProductMetaLabel(product)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productBrand: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  productCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  barcodeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
});
