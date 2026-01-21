import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button, Input, Card, THEME } from "../../components/ui";
import { PersonalInfo } from "../../types/user";
import TimePicker from "../../components/onboarding/TimePicker";
import {
  useEditContext,
  useEditMode,
  useEditData,
  useEditActions,
} from "../../contexts/EditContext";

interface PersonalInfoScreenProps {
  onNext?: (data: PersonalInfo) => void;
  onBack?: () => void;
  initialData?: Partial<PersonalInfo>;
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const PersonalInfoScreen: React.FC<PersonalInfoScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
  isEditMode: propIsEditMode = false,
  onEditComplete,
  onEditCancel,
}) => {
  // Detect edit mode from context or props
  const isInEditContext = (() => {
    try {
      const { isEditMode } = useEditMode();
      return isEditMode;
    } catch {
      return false;
    }
  })();

  const isEditMode = isInEditContext || propIsEditMode;

  // Get edit data if in edit context
  const editContextData = (() => {
    try {
      const { currentData, updateData } = useEditData();
      const { saveChanges, cancelEdit } = useEditActions();
      return { currentData, updateData, saveChanges, cancelEdit };
    } catch {
      return null;
    }
  })();

  // Determine initial data source
  const getInitialData = () => {
    if (isEditMode && editContextData?.currentData) {
      return editContextData.currentData;
    }
    return initialData;
  };

  const [formData, setFormData] = useState<Omit<PersonalInfo, "activityLevel">>(
    () => {
      const data = getInitialData();
      return {
        name: data.name || "",
        email: data.email || "",
        age: data.age || "",
        gender: data.gender || "",
        height: data.height || "",
        weight: data.weight || "",
        country: data.country || "",
        state: data.state || "",
        region: data.region || "",
        wake_time: data.wake_time || "07:00",
        sleep_time: data.sleep_time || "23:00",
        occupation_type: data.occupation_type || "desk_job",
      };
    },
  );

  // Time picker state
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [customCountry, setCustomCountry] = useState("");

  const [errors, setErrors] = useState<
    Partial<Omit<PersonalInfo, "activityLevel">>
  >({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Update form data when edit context data is loaded (only once)
  useEffect(() => {
    if (isEditMode && editContextData?.currentData && !isDataPopulated) {
      const data = editContextData.currentData;

      // Check if we have actual user data (not just metadata)
      const hasActualData =
        data.name || data.age || data.gender || data.height || data.weight;

      console.log("🔄 PersonalInfoScreen: Loading edit data:", {
        hasData: !!data,
        hasActualData,
        dataKeys: Object.keys(data),
        name: data.name,
        age: data.age,
        gender: data.gender,
      });

      if (hasActualData) {
        const newFormData = {
          name: data.name || "",
          email: data.email || "",
          age: data.age ? String(data.age) : "",
          gender: data.gender || "",
          height: data.height ? String(data.height) : "",
          weight: data.weight ? String(data.weight) : "",
          country: data.country || "",
          state: data.state || "",
          region: data.region || "",
          wake_time: data.wake_time || "07:00",
          sleep_time: data.sleep_time || "23:00",
          occupation_type: data.occupation_type || "desk_job",
        };
        console.log("✅ PersonalInfoScreen: Setting form data:", newFormData);
        setFormData(newFormData);
        setIsDataPopulated(true);
      } else {
        console.warn(
          "⚠️ PersonalInfoScreen: No actual user data found in currentData",
        );
      }
    }
  }, [isEditMode, editContextData?.currentData, isDataPopulated]);

  // Sync form data with edit context (but not on initial load)
  useEffect(() => {
    if (isEditMode && editContextData?.updateData && isDataPopulated) {
      // Throttle updates to avoid excessive calls
      const timeoutId = setTimeout(() => {
        editContextData.updateData(formData);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode, isDataPopulated]); // Removed editContextData?.updateData from deps

  const validateForm = (): boolean => {
    const newErrors: Partial<Omit<PersonalInfo, "activityLevel">> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email is optional during onboarding - users can add it later

    // Improved age validation - use parseInt for consistency with backend
    const age = parseInt(formData.age ?? "");
    if (
      !formData.age ||
      !formData.age.trim() ||
      isNaN(age) ||
      age < 13 ||
      age > 120
    ) {
      newErrors.age = "Please enter a valid age (13-120)";
    }

    if (!formData.gender) {
      newErrors.gender = "Please select your gender";
    }

    // Improved height validation
    const height = parseFloat(formData.height ?? "");
    if (
      !formData.height ||
      !formData.height.trim() ||
      isNaN(height) ||
      height < 100 ||
      height > 250
    ) {
      newErrors.height = "Please enter a valid height (100-250 cm)";
    }

    // Improved weight validation
    const weight = parseFloat(formData.weight ?? "");
    if (
      !formData.weight ||
      !formData.weight.trim() ||
      isNaN(weight) ||
      weight < 30 ||
      weight > 300
    ) {
      newErrors.weight = "Please enter a valid weight (30-300 kg)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    if (isEditMode) {
      // In edit mode, save the changes
      if (editContextData?.saveChanges) {
        const success = await editContextData.saveChanges();
        if (success && onEditComplete) {
          onEditComplete();
        }
      }
    } else {
      // In onboarding mode, proceed to next step
      if (onNext) {
        // Add placeholder activityLevel for backward compatibility
        onNext({ ...formData, activityLevel: "" } as PersonalInfo);
      }
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      // In edit mode, cancel the edit
      if (editContextData?.cancelEdit) {
        editContextData.cancelEdit();
      } else if (onEditCancel) {
        onEditCancel();
      }
    } else {
      // In onboarding mode, go back
      if (onBack) {
        onBack();
      }
    }
  };

  const updateField = (
    field: keyof Omit<PersonalInfo, "activityLevel">,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  // Constants for location and occupation
  const COUNTRIES_WITH_STATES = [
    {
      name: "United States",
      states: [
        "California",
        "Texas",
        "Florida",
        "New York",
        "Pennsylvania",
        "Illinois",
        "Ohio",
        "Georgia",
        "North Carolina",
        "Michigan",
      ],
    },
    {
      name: "India",
      states: [
        "Maharashtra",
        "Gujarat",
        "Karnataka",
        "Tamil Nadu",
        "Uttar Pradesh",
        "West Bengal",
        "Rajasthan",
        "Madhya Pradesh",
        "Andhra Pradesh",
        "Kerala",
      ],
    },
    {
      name: "Canada",
      states: [
        "Ontario",
        "Quebec",
        "British Columbia",
        "Alberta",
        "Manitoba",
        "Saskatchewan",
        "Nova Scotia",
        "New Brunswick",
        "Newfoundland and Labrador",
        "Prince Edward Island",
      ],
    },
    {
      name: "United Kingdom",
      states: ["England", "Scotland", "Wales", "Northern Ireland"],
    },
    {
      name: "Australia",
      states: [
        "New South Wales",
        "Victoria",
        "Queensland",
        "Western Australia",
        "South Australia",
        "Tasmania",
        "Australian Capital Territory",
        "Northern Territory",
      ],
    },
  ];

  const OCCUPATION_OPTIONS = [
    {
      value: "desk_job",
      label: "Desk Job",
      icon: "💻",
      description: "Office worker, programmer, student - mostly sitting",
    },
    {
      value: "light_active",
      label: "Light Activity",
      icon: "🚶",
      description: "Teacher, retail, light housework - some movement",
    },
    {
      value: "moderate_active",
      label: "Moderate Activity",
      icon: "🏃",
      description: "Nurse, server, active parent - regular movement",
    },
    {
      value: "heavy_labor",
      label: "Heavy Labor",
      icon: "🏗️",
      description: "Construction, farming, warehouse - physical work",
    },
    {
      value: "very_active",
      label: "Very Active",
      icon: "💪",
      description: "Athlete, trainer, manual labor - constant activity",
    },
  ];

  // Update available states when country changes
  useEffect(() => {
    const selectedCountry = COUNTRIES_WITH_STATES.find(
      (c) => c.name === formData.country,
    );
    if (selectedCountry) {
      setAvailableStates(selectedCountry.states);
      setShowCustomCountry(false);
    } else if (formData.country === "Other") {
      setAvailableStates([]);
      setShowCustomCountry(true);
    } else {
      setAvailableStates([]);
      setShowCustomCountry(false);
    }
  }, [formData.country]);

  // Helper functions
  const formatTimeForDisplay = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateSleepDuration = (): string => {
    if (!formData.wake_time || !formData.sleep_time) return "";

    const [wakeHour, wakeMin] = formData.wake_time.split(":").map(Number);
    const [sleepHour, sleepMin] = formData.sleep_time.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight sleep

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return `${hours}h ${minutes}m`;
  };

  const handleCountryChange = (country: string) => {
    updateField("country", country);
    updateField("state", ""); // Reset state when country changes
    updateField("region", ""); // Reset region when country changes
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>
            This helps us create a personalized fitness plan for you
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => updateField("name", value)}
            error={errors.name}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Age"
                placeholder="25"
                value={formData.age}
                onChangeText={(value) => updateField("age", value)}
                keyboardType="numeric"
                error={errors.age}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      formData.gender === option.value &&
                        styles.genderOptionSelected,
                    ]}
                    onPress={() => updateField("gender", option.value)}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        formData.gender === option.value &&
                          styles.genderOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender && (
                <Text style={styles.errorText}>{errors.gender}</Text>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Height (cm)"
                placeholder="170"
                value={formData.height}
                onChangeText={(value) => updateField("height", value)}
                keyboardType="numeric"
                error={errors.height}
              />
            </View>

            <View style={styles.halfWidth}>
              <Input
                label="Weight (kg)"
                placeholder="70"
                value={formData.weight}
                onChangeText={(value) => updateField("weight", value)}
                keyboardType="numeric"
                error={errors.weight}
              />
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.inputLabel}>Country</Text>
            <View style={styles.countryGrid}>
              {COUNTRIES_WITH_STATES.map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[
                    styles.countryOption,
                    formData.country === country.name &&
                      styles.countryOptionSelected,
                  ]}
                  onPress={() => handleCountryChange(country.name)}
                >
                  <Text
                    style={[
                      styles.countryOptionText,
                      formData.country === country.name &&
                        styles.countryOptionTextSelected,
                    ]}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.countryOption,
                  formData.country === "Other" && styles.countryOptionSelected,
                ]}
                onPress={() => handleCountryChange("Other")}
              >
                <Text
                  style={[
                    styles.countryOptionText,
                    formData.country === "Other" &&
                      styles.countryOptionTextSelected,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>
            {errors.country && (
              <Text style={styles.errorText}>{errors.country}</Text>
            )}

            {/* Custom Country Input */}
            {showCustomCountry && (
              <View style={styles.marginTop}>
                <Input
                  label="Country Name"
                  placeholder="Enter your country"
                  value={customCountry}
                  onChangeText={setCustomCountry}
                />
              </View>
            )}

            {/* State Selection */}
            {availableStates.length > 0 && (
              <View style={styles.marginTop}>
                <Text style={styles.inputLabel}>State/Province</Text>
                <View style={styles.stateGrid}>
                  {availableStates.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateOption,
                        formData.state === state && styles.stateOptionSelected,
                      ]}
                      onPress={() => updateField("state", state)}
                    >
                      <Text
                        style={[
                          styles.stateOptionText,
                          formData.state === state &&
                            styles.stateOptionTextSelected,
                        ]}
                      >
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state}</Text>
                )}
              </View>
            )}

            {/* Custom State Input for Other Countries */}
            {showCustomCountry && (
              <View style={styles.marginTop}>
                <Input
                  label="State/Province"
                  placeholder="Enter your state or province"
                  value={formData.state}
                  onChangeText={(value) => updateField("state", value)}
                />
              </View>
            )}

            {/* Region (Optional) */}
            <View style={styles.marginTop}>
              <Input
                label="Region/City (Optional)"
                placeholder="e.g., Mumbai, Los Angeles, London"
                value={formData.region || ""}
                onChangeText={(value) => updateField("region", value)}
              />
            </View>
          </View>

          {/* Occupation Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Activity</Text>
            <Text style={styles.sectionSubtitle}>
              This helps us understand your daily movement beyond exercise
            </Text>
            {OCCUPATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.occupationOption,
                  formData.occupation_type === option.value &&
                    styles.occupationOptionSelected,
                ]}
                onPress={() =>
                  updateField("occupation_type", option.value as any)
                }
              >
                <Text style={styles.occupationIcon}>{option.icon}</Text>
                <View style={styles.occupationTextContainer}>
                  <Text
                    style={[
                      styles.occupationLabel,
                      formData.occupation_type === option.value &&
                        styles.occupationLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.occupationDescription,
                      formData.occupation_type === option.value &&
                        styles.occupationDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sleep Schedule Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sleep Schedule</Text>
            <Text style={styles.sectionSubtitle}>
              Help us understand your daily routine for personalized
              recommendations
            </Text>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>Wake Up Time</Text>
                <TouchableOpacity
                  style={styles.timeSelector}
                  onPress={() => setShowWakeTimePicker(true)}
                >
                  <Text style={styles.timeText}>
                    🌅 {formatTimeForDisplay(formData.wake_time || "07:00")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>Sleep Time</Text>
                <TouchableOpacity
                  style={styles.timeSelector}
                  onPress={() => setShowSleepTimePicker(true)}
                >
                  <Text style={styles.timeText}>
                    🌙 {formatTimeForDisplay(formData.sleep_time || "23:00")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sleep Duration Display */}
            {formData.wake_time && formData.sleep_time && (
              <Card style={styles.sleepDurationCard}>
                <View style={styles.sleepDurationContent}>
                  <Text style={styles.sleepDurationIcon}>😴</Text>
                  <View style={styles.sleepDurationText}>
                    <Text style={styles.sleepDurationTitle}>
                      Sleep Duration: {calculateSleepDuration()}
                    </Text>
                    <Text style={styles.sleepDurationSubtitle}>
                      Recommended: 7-9 hours for optimal fitness results
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Time Picker Modals */}
      <TimePicker
        visible={showWakeTimePicker}
        initialTime={formData.wake_time || "07:00"}
        onTimeSelect={(time) => {
          updateField("wake_time", time);
          setShowWakeTimePicker(false);
        }}
        onClose={() => setShowWakeTimePicker(false)}
        title="Select Wake Up Time"
        is24Hour={true}
      />

      <TimePicker
        visible={showSleepTimePicker}
        initialTime={formData.sleep_time || "23:00"}
        onTimeSelect={(time) => {
          updateField("sleep_time", time);
          setShowSleepTimePicker(false);
        }}
        onClose={() => setShowSleepTimePicker(false)}
        title="Select Sleep Time"
        is24Hour={true}
      />

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title={isEditMode ? "Cancel" : "Back"}
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title={isEditMode ? "Save Changes" : "Next"}
            onPress={handleNext}
            variant="primary"
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
  },

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.md,
  },

  halfWidth: {
    flex: 1,
  },

  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  genderContainer: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  genderOption: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
  },

  genderOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },

  genderOptionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  genderOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activitySection: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityCardContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  activityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  nextButton: {
    flex: 2,
  },

  // New styles for location section
  section: {
    marginTop: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  countryOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    minWidth: rw(100),
  },

  countryOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  countryOptionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textAlign: "center",
  },

  countryOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },

  stateOption: {
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  stateOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  stateOptionText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  stateOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  marginTop: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  // Occupation styles
  occupationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  occupationOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  occupationIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  occupationTextContainer: {
    flex: 1,
  },

  occupationLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  occupationLabelSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  occupationDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  occupationDescriptionSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  // Sleep schedule styles
  timeSelector: {
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  timeText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  sleepDurationCard: {
    marginTop: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 1,
  },

  sleepDurationContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  sleepDurationIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  sleepDurationText: {
    flex: 1,
  },

  sleepDurationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  sleepDurationSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
});
