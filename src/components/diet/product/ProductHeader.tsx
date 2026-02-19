import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { THEME } from "../../ui";
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
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.md,
    marginRight: THEME.spacing.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  productBrand: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },
  productCategory: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  barcodeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontFamily: "monospace",
  },
});
