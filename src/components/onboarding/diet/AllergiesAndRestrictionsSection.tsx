/**
 * S3 "Fuel" — AllergiesAndRestrictionsSection (blueprint §3 S3, §5 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. allergies[] and restrictions[] are Pill
 * grids (8px wrap, one left edge) inside a single CollapsibleSection that
 * defaults to collapsed and removes its content from layout when closed.
 *
 * Scannability upgrades (presentation-only):
 *  - Pills follow the tab's selected-state system: identity icon (ink2) off,
 *    accent checkmark + accentDim on.
 *  - Each group label row carries a live count on its right edge.
 *  - The collapsed subtitle names the picks, not just the total count —
 *    closing the section never hides what's inside.
 *
 * Custom free-text entry ("enter what's missing"): each grid ends in a dashed
 * ghost "+ Add your own" pill. Tapping it swaps the pill for a full-width
 * inline editor — the shared aurora UnderlineInput (borderless, hairline
 * underline that turns accent on focus — the allowed "focused underline"), an
 * "Add" confirm (accent only when there's text) and a quiet close glyph. All
 * targets are ≥44pt. Values are normalized (trim/lowercase/dasherized),
 * deduped case-insensitively, and appended to the SAME arrays via
 * updateField("allergies" | "restrictions", values) — identical to every
 * other pill in the grid. Custom values render as selected pills and remain
 * removable with one tap.
 *
 * Presentation-only redesign — props contract (formData, updateField)
 * unchanged.
 */

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ALLERGY_OPTIONS,
  RESTRICTION_OPTIONS,
} from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { DietPreferencesData } from "../../../types/onboarding";
import { UnderlineInput } from "../aurora/UnderlineInput";
import {
  CollapsibleSection,
  Pill,
  SectionLabel,
  tokens,
  type as typeScale,
} from "../fresh";
import { previewNames } from "./selectionPreview";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Live count for a group label row's right edge. */
const GroupLabelRow: React.FC<{ label: string; count: number }> = ({
  label,
  count,
}) => (
  <View style={styles.groupHeader}>
    <SectionLabel>{label}</SectionLabel>
    {count > 0 && (
      <Text style={styles.groupCount}>
        <Text style={styles.groupCountValue}>{count}</Text> added
      </Text>
    )}
  </View>
);

const toggleValue = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const prettify = (raw: string): string =>
  raw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** trim → lowercase → dasherize ("Tree Nuts" → "tree-nuts"). */
const normalize = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

interface CustomEntryInputProps {
  placeholder: string;
  /** Called with the normalized value when confirmed. */
  onSubmit: (value: string) => void;
  onCancel: () => void;
  testIDPrefix: string;
}

/**
 * The inline custom-entry editor — the shared aurora UnderlineInput
 * (borderless; hairline underline turns accent on focus) + Add / close, all
 * at ≥44pt targets. Owns its own text state; empty submit behaves as cancel.
 */
const CustomEntryInput: React.FC<CustomEntryInputProps> = ({
  placeholder,
  onSubmit,
  onCancel,
  testIDPrefix,
}) => {
  const [text, setText] = useState("");
  const value = normalize(text);
  const canAdd = value.length > 0;

  const submit = () => {
    if (canAdd) {
      onSubmit(value);
    } else {
      onCancel();
    }
  };

  return (
    <View style={styles.entryRow}>
      <View style={styles.entryField}>
        <UnderlineInput
          autoFocus
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          returnKeyType="done"
          onSubmitEditing={submit}
          autoCapitalize="none"
          autoCorrect={false}
          accentColor={tokens.accent}
          containerStyle={styles.entryInputContainer}
          testID={`${testIDPrefix}-input`}
        />
      </View>
      <Pressable
        onPress={submit}
        disabled={!canAdd}
        accessibilityRole="button"
        accessibilityLabel="Add custom item"
        testID={`${testIDPrefix}-confirm`}
        style={styles.entryAction}
      >
        <Text style={[styles.entryAdd, !canAdd && styles.entryAddDisabled]}>
          Add
        </Text>
      </Pressable>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel custom entry"
        testID={`${testIDPrefix}-cancel`}
        style={[styles.entryAction, styles.entryCancel]}
      >
        <Ionicons name="close" size={20} color={tokens.ink3} />
      </Pressable>
    </View>
  );
};

interface AddPillProps {
  onPress: () => void;
  testID: string;
}

/** The quiet dashed ghost pill that opens the inline editor (≥44pt target). */
const AddPill: React.FC<AddPillProps> = ({ onPress, testID }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Add a custom item"
    testID={testID}
  >
    <View style={styles.addPill}>
      <Ionicons
        name="add"
        size={16}
        color={tokens.ink3}
        style={styles.addPillIcon}
      />
      <Text style={styles.addPillLabel}>Add your own</Text>
    </View>
  </Pressable>
);

interface AllergiesAndRestrictionsSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
}

export const AllergiesAndRestrictionsSection: React.FC<
  AllergiesAndRestrictionsSectionProps
> = ({ formData, updateField }) => {
  const [open, setOpen] = useState(false);
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [addingRestriction, setAddingRestriction] = useState(false);

  const allergyPresets = ALLERGY_OPTIONS.map((o) => o.value);
  const customAllergies = formData.allergies.filter(
    (a) => !allergyPresets.includes(a),
  );
  const restrictionPresets = RESTRICTION_OPTIONS.map((o) => o.value);
  const customRestrictions = formData.restrictions.filter(
    (r) => !restrictionPresets.includes(r),
  );

  const totalCount = formData.allergies.length + formData.restrictions.length;

  const labelFor = (
    options: { value: string; label: string }[],
    value: string,
  ): string => options.find((o) => o.value === value)?.label ?? prettify(value);

  const selectedNames = [
    ...formData.allergies.map((a) => labelFor(ALLERGY_OPTIONS, a)),
    ...formData.restrictions.map((r) => labelFor(RESTRICTION_OPTIONS, r)),
  ];

  const addCustom = (field: "allergies" | "restrictions", raw: string) => {
    const value = normalize(raw);
    if (!value) return;
    const list = formData[field];
    if (list.some((x) => x.toLowerCase() === value)) return;
    updateField(field, [...list, value]);
  };

  return (
    <CollapsibleSection
      title="Allergies & Restrictions"
      subtitle={
        totalCount > 0
          ? `${totalCount} added · ${previewNames(selectedNames)}`
          : "Food allergies and dietary restrictions (optional)"
      }
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
      testID="allergies-restrictions-section"
    >
      <View>
        <GroupLabelRow
          label="Food Allergies"
          count={formData.allergies.length}
        />
        <View style={styles.pillGrid}>
          {ALLERGY_OPTIONS.map((o) => (
            <Pill
              key={o.id}
              label={o.label}
              icon={
                formData.allergies.includes(o.value)
                  ? "checkmark"
                  : (o.iconName as IoniconName)
              }
              selected={formData.allergies.includes(o.value)}
              onPress={() =>
                updateField(
                  "allergies",
                  toggleValue(formData.allergies, o.value),
                )
              }
              testID={`allergy-${o.id}`}
            />
          ))}
          {customAllergies.map((a) => (
            <Pill
              key={`custom-allergy-${a}`}
              label={prettify(a)}
              icon="checkmark"
              selected
              onPress={() =>
                updateField("allergies", toggleValue(formData.allergies, a))
              }
              testID={`allergy-custom-${a}`}
            />
          ))}
          {!addingAllergy && (
            <AddPill
              onPress={() => setAddingAllergy(true)}
              testID="allergy-add-open"
            />
          )}
        </View>
        {addingAllergy && (
          <CustomEntryInput
            placeholder="e.g. Peanuts"
            onSubmit={(v) => {
              addCustom("allergies", v);
              setAddingAllergy(false);
            }}
            onCancel={() => setAddingAllergy(false)}
            testIDPrefix="allergy-add"
          />
        )}
      </View>

      <View style={styles.groupGap}>
        <GroupLabelRow
          label="Dietary Restrictions"
          count={formData.restrictions.length}
        />
        <View style={styles.pillGrid}>
          {RESTRICTION_OPTIONS.map((o) => (
            <Pill
              key={o.id}
              label={o.label}
              icon={
                formData.restrictions.includes(o.value)
                  ? "checkmark"
                  : (o.iconName as IoniconName)
              }
              selected={formData.restrictions.includes(o.value)}
              onPress={() =>
                updateField(
                  "restrictions",
                  toggleValue(formData.restrictions, o.value),
                )
              }
              testID={`restriction-${o.id}`}
            />
          ))}
          {customRestrictions.map((r) => (
            <Pill
              key={`custom-restriction-${r}`}
              label={prettify(r)}
              icon="checkmark"
              selected
              onPress={() =>
                updateField(
                  "restrictions",
                  toggleValue(formData.restrictions, r),
                )
              }
              testID={`restriction-custom-${r}`}
            />
          ))}
          {!addingRestriction && (
            <AddPill
              onPress={() => setAddingRestriction(true)}
              testID="restriction-add-open"
            />
          )}
        </View>
        {addingRestriction && (
          <CustomEntryInput
            placeholder="e.g. Halal"
            onSubmit={(v) => {
              addCustom("restrictions", v);
              setAddingRestriction(false);
            }}
            onCancel={() => setAddingRestriction(false)}
            testIDPrefix="restriction-add"
          />
        )}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  groupGap: {
    marginTop: 20,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupCount: {
    ...typeScale.caption,
  },
  groupCountValue: {
    color: tokens.ink,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  // Dashed ghost "+ Add your own" pill — quieter than a selectable Pill on
  // purpose, but still a full 44pt target.
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: tokens.hairline,
    backgroundColor: "transparent",
  },
  addPillIcon: {
    marginRight: 4,
  },
  addPillLabel: {
    ...typeScale.body,
    color: tokens.ink3,
  },
  // Inline editor — shared aurora UnderlineInput + 44pt Add / close targets.
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minHeight: 44,
  },
  entryField: {
    flex: 1,
    marginRight: 8,
  },
  entryInputContainer: {
    paddingTop: 0,
  },
  entryAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  entryAdd: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: tokens.accent,
  },
  entryAddDisabled: {
    color: tokens.ink3,
  },
  entryCancel: {
    marginLeft: 4,
  },
});

export default AllergiesAndRestrictionsSection;
