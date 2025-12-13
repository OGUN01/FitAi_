import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Input, Card, SegmentedControl, FeatureGrid, type SegmentOption, type FeatureItem } from '../../../components/ui';
import { GlassCard, AnimatedPressable, AnimatedSection, HeroSection, AnimatedIcon } from '../../../components/ui/aurora';
import { gradients, toLinearGradientProps } from '../../../theme/gradients';
import { PersonalInfoData, TabValidationResult } from '../../../types/onboarding';
import TimePicker from '../../../components/onboarding/TimePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

interface PersonalInfoTabProps {
  data: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: PersonalInfoData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

interface CountryState {
  name: string;
  states: string[];
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

// Top countries with their states (simplified for production app)
const COUNTRIES_WITH_STATES: CountryState[] = [
  {
    name: 'United States',
    states: ['California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan']
  },
  {
    name: 'India', 
    states: ['Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Andhra Pradesh', 'Kerala']
  },
  {
    name: 'Canada',
    states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island']
  },
  {
    name: 'United Kingdom',
    states: ['England', 'Scotland', 'Wales', 'Northern Ireland']
  },
  {
    name: 'Australia',
    states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory']
  },
  {
    name: 'Germany',
    states: ['North Rhine-Westphalia', 'Bavaria', 'Baden-Württemberg', 'Lower Saxony', 'Hesse', 'Saxony', 'Rhineland-Palatinate', 'Berlin']
  },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', iconName: 'man-outline' },
  { value: 'female', label: 'Female', iconName: 'woman-outline' },
  { value: 'other', label: 'Other', iconName: 'people-outline' },
  { value: 'prefer_not_to_say', label: 'Private', iconName: 'lock-closed-outline' },
] as const;

const OCCUPATION_OPTIONS = [
  {
    value: 'desk_job',
    label: 'Desk Job',
    iconName: 'laptop-outline',
    gradient: ['#6366F1', '#8B5CF6'],
    description: 'Office worker, programmer, student - mostly sitting'
  },
  {
    value: 'light_active',
    label: 'Light Activity',
    iconName: 'walk-outline',
    gradient: ['#3B82F6', '#06B6D4'],
    description: 'Teacher, retail, light housework - some movement'
  },
  {
    value: 'moderate_active',
    label: 'Moderate Activity',
    iconName: 'fitness-outline',
    gradient: ['#10B981', '#14B8A6'],
    description: 'Nurse, server, active parent - regular movement'
  },
  {
    value: 'heavy_labor',
    label: 'Heavy Labor',
    iconName: 'construct-outline',
    gradient: ['#F59E0B', '#EF4444'],
    description: 'Construction, farming, warehouse - physical work'
  },
  {
    value: 'very_active',
    label: 'Very Active',
    iconName: 'barbell-outline',
    gradient: ['#EF4444', '#DC2626'],
    description: 'Athlete, trainer, manual labor - constant activity'
  }
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
  data,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // No longer creating separate state instances - using props from parent
  
  // Form state
  const [formData, setFormData] = useState<PersonalInfoData>({
    first_name: data?.first_name || '',
    last_name: data?.last_name || '',
    age: data?.age || 0, // Start with 0 to allow proper user input
    gender: data?.gender || 'male',
    country: data?.country || '',
    state: data?.state || '',
    region: data?.region || '',
    wake_time: data?.wake_time || '07:00',
    sleep_time: data?.sleep_time || '23:00',
    occupation_type: data?.occupation_type || 'desk_job',
  });
  
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [customCountry, setCustomCountry] = useState('');
  
  // Time picker state
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  
  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  useEffect(() => {
    if (data) {
      console.log('[SYNC] PersonalInfoTab: Syncing form data with prop data:', data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        age: data.age || 0,
        gender: data.gender || 'male',
        country: data.country || '',
        state: data.state || '',
        region: data.region || '',
        wake_time: data.wake_time || '07:00',
        sleep_time: data.sleep_time || '23:00',
        occupation_type: data.occupation_type || 'desk_job',
      });
    }
  }, [data]);
  
  // Update available states when country changes
  useEffect(() => {
    const selectedCountry = COUNTRIES_WITH_STATES.find(c => c.name === formData.country);
    if (selectedCountry) {
      setAvailableStates(selectedCountry.states);
      setShowCustomCountry(false);
    } else if (formData.country === 'Other') {
      setAvailableStates([]);
      setShowCustomCountry(true);
    } else {
      setAvailableStates([]);
      setShowCustomCountry(false);
    }
  }, [formData.country]);
  
  // Note: We no longer auto-update parent on every formData change to avoid infinite loops
  // Updates happen via onUpdate in the Next button handler
  
  // Validate when formData changes to show real-time validation feedback
  useEffect(() => {
    // Only trigger validation if validationResult exists (means we're tracking validation)
    if (validationResult !== undefined) {
      // Debounce validation to avoid excessive calls
      const timer = setTimeout(() => {
        const finalData = showCustomCountry && customCountry 
          ? { ...formData, country: customCountry }
          : formData;
        onUpdate(finalData);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData, showCustomCountry, customCountry, validationResult, onUpdate]);
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  const validateFormData = (data: PersonalInfoData): string[] => {
    const errors: string[] = [];
    
    if (!data.first_name.trim()) {
      errors.push('First name is required');
    }
    
    if (!data.last_name.trim()) {
      errors.push('Last name is required');
    }
    
    if (!data.age || data.age < 13 || data.age > 120) {
      errors.push('Valid age (13-120) is required');
    }
    
    if (!data.country.trim()) {
      errors.push('Country is required');
    }
    
    if (!data.state.trim()) {
      errors.push('State is required');
    }
    
    if (!data.occupation_type) {
      errors.push('Occupation type is required');
    }
    
    return errors;
  };
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const updateField = <K extends keyof PersonalInfoData>(
    field: K, 
    value: PersonalInfoData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCountryChange = (country: string) => {
    updateField('country', country);
    updateField('state', ''); // Reset state when country changes
    updateField('region', ''); // Reset region when country changes
  };
  
  const handleAgeChange = (ageText: string) => {
    // Allow empty string for better user experience while typing
    if (ageText === '') {
      setFormData(prev => ({ ...prev, age: 0 })); // Use 0 to indicate empty field
      return;
    }
    
    const age = parseInt(ageText);
    // Only update if it's a valid number
    if (!isNaN(age) && age >= 0) {
      setFormData(prev => ({ ...prev, age }));
    }
  };
  
  const formatTimeForDisplay = (time: string): string => {
    // Convert 24h format to 12h format for display
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  const handleTimeChange = (field: 'wake_time' | 'sleep_time', time: string) => {
    updateField(field, time);
  };
  
  const calculateSleepDuration = (): string => {
    if (!formData.wake_time || !formData.sleep_time) return '';
    
    const [wakeHour, wakeMin] = formData.wake_time.split(':').map(Number);
    const [sleepHour, sleepMin] = formData.sleep_time.split(':').map(Number);
    
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    
    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight sleep
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `${hours}h ${minutes}m`;
  };
  
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================
  
  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find(error => 
      error.toLowerCase().includes(fieldName.toLowerCase())
    );
  };
  
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderNameSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Full Name</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Input
            label="First Name"
            placeholder="Enter your first name"
            value={formData.first_name}
            onChangeText={(value) => updateField('first_name', value)}
            error={hasFieldError('first name') ? getFieldError('first name') : undefined}
          />
        </View>
        <View style={styles.halfWidth}>
          <Input
            label="Last Name"
            placeholder="Enter your last name"
            value={formData.last_name}
            onChangeText={(value) => updateField('last_name', value)}
            error={hasFieldError('last name') ? getFieldError('last name') : undefined}
          />
        </View>
      </View>
    </GlassCard>
  );
  
  const renderDemographicsSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Demographics</Text>
      
      {/* Age Input - Full Width */}
      <View style={styles.fieldContainer}>
        <Input
          label="Age"
          placeholder="Enter your age (e.g., 25)"
          value={formData.age > 0 ? formData.age.toString() : ''}
          onChangeText={handleAgeChange}
          keyboardType="numeric"
          error={hasFieldError('age') ? getFieldError('age') : undefined}
        />
      </View>
      
      {/* Gender Selection - Full Width */}
      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Gender *</Text>
        <SegmentedControl
          options={GENDER_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            value: opt.value
          }))}
          selectedId={formData.gender}
          onSelect={(id) => updateField('gender', id as PersonalInfoData['gender'])}
          gradient={['#6366F1', '#8B5CF6']}
          style={styles.genderSegmentedControl}
        />
        {hasFieldError('gender') && (
          <Text style={styles.errorText}>{getFieldError('gender')}</Text>
        )}
      </View>
    </GlassCard>
  );
  
  const renderLocationSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Location</Text>
      
      {/* Country Selection */}
      <View style={styles.locationField}>
        <Text style={styles.inputLabel}>Country *</Text>
        <View style={styles.countryGrid}>
          {COUNTRIES_WITH_STATES.map((country) => (
            <AnimatedPressable
              key={country.name}
              style={[
                styles.countryOption,
                ...(formData.country === country.name ? [styles.countryOptionSelected] : []),
              ]}
              onPress={() => handleCountryChange(country.name)}
              scaleValue={0.95}
            >
              <Text
                style={[
                  styles.countryOptionText,
                  formData.country === country.name && styles.countryOptionTextSelected,
                ]}
              >
                {country.name}
              </Text>
            </AnimatedPressable>
          ))}
          <AnimatedPressable
            style={[
              styles.countryOption,
              ...(formData.country === 'Other' ? [styles.countryOptionSelected] : []),
            ]}
            onPress={() => handleCountryChange('Other')}
            scaleValue={0.95}
          >
            <Text
              style={[
                styles.countryOptionText,
                formData.country === 'Other' && styles.countryOptionTextSelected,
              ]}
            >
              Other
            </Text>
          </AnimatedPressable>
        </View>
        {hasFieldError('country') && (
          <Text style={styles.errorText}>{getFieldError('country')}</Text>
        )}
      </View>
      
      {/* Custom Country Input */}
      {showCustomCountry && (
        <View style={styles.locationField}>
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
        <View style={styles.locationField}>
          <Text style={styles.inputLabel}>State/Province *</Text>
          <View style={styles.stateGrid}>
            {availableStates.map((state) => (
              <AnimatedPressable
                key={state}
                style={[
                  styles.stateOption,
                  ...(formData.state === state ? [styles.stateOptionSelected] : []),
                ]}
                onPress={() => updateField('state', state)}
                scaleValue={0.95}
              >
                <Text
                  style={[
                    styles.stateOptionText,
                    formData.state === state && styles.stateOptionTextSelected,
                  ]}
                >
                  {state}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
          {hasFieldError('state') && (
            <Text style={styles.errorText}>{getFieldError('state')}</Text>
          )}
        </View>
      )}
      
      {/* Custom State Input for Other Countries */}
      {showCustomCountry && (
        <View style={styles.locationField}>
          <Input
            label="State/Province"
            placeholder="Enter your state or province"
            value={formData.state}
            onChangeText={(value) => updateField('state', value)}
          />
        </View>
      )}
      
      {/* Region (Optional) */}
      <View style={styles.locationField}>
        <Input
          label="Region/City (Optional)"
          placeholder="e.g., Mumbai, Los Angeles, London"
          value={formData.region || ''}
          onChangeText={(value) => updateField('region', value)}
        />
      </View>
    </GlassCard>
  );

  const renderOccupationSection = () => {
    const featureItems: FeatureItem[] = OCCUPATION_OPTIONS.map(option => ({
      id: option.value,
      label: option.label,
      selected: formData.occupation_type === option.value,
      icon: (
        <Ionicons
          name={option.iconName as any}
          size={24}
          color="#FFFFFF"
        />
      ),
    }));

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Daily Activity</Text>
        <Text style={styles.sectionSubtitle}>
          This helps us understand your daily movement beyond exercise
        </Text>

        <FeatureGrid
          items={featureItems}
          onItemPress={(id) => updateField('occupation_type', id as PersonalInfoData['occupation_type'])}
          columns={2}
          animated={true}
          selectable={true}
          style={styles.occupationGrid}
        />

        {hasFieldError('occupation') && (
          <Text style={styles.errorText}>{getFieldError('occupation')}</Text>
        )}
      </GlassCard>
    );
  };

  const renderSleepScheduleSection = () => {
    const sleepDuration = calculateSleepDuration();
    const sleepHours = parseFloat(sleepDuration.split('h')[0]) || 0;
    const isHealthySleep = sleepHours >= 7 && sleepHours <= 9;
    
    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Sleep Schedule</Text>
        <Text style={styles.sectionSubtitle}>
          Help us understand your daily routine for personalized recommendations
        </Text>
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.inputLabel}>Wake Up Time *</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => setShowWakeTimePicker(true)}
            >
              <View style={styles.timeIconContainer}>
                <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
                <Text style={styles.timeText}>
                  {formatTimeForDisplay(formData.wake_time)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.inputLabel}>Sleep Time *</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => setShowSleepTimePicker(true)}
            >
              <View style={styles.timeIconContainer}>
                <Ionicons name="moon-outline" size={18} color="#6366F1" />
                <Text style={styles.timeText}>
                  {formatTimeForDisplay(formData.sleep_time)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sleep Duration Display */}
        {sleepDuration && (
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={StyleSheet.flatten([
              styles.sleepDurationCard,
              isHealthySleep ? styles.sleepDurationHealthy : styles.sleepDurationWarning
            ])}
          >
            <View style={styles.sleepDurationContent}>
              <View style={styles.sleepDurationIconContainer}>
                <Ionicons
                  name={isHealthySleep ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={isHealthySleep ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.warning}
                />
              </View>
              <View style={styles.sleepDurationText}>
                <Text style={styles.sleepDurationTitle}>
                  Sleep Duration: {sleepDuration}
                </Text>
                <Text style={styles.sleepDurationSubtitle}>
                  {isHealthySleep
                    ? 'Great! This is within the recommended 7-9 hours.'
                    : sleepHours < 7
                      ? 'Consider getting more sleep for better fitness results.'
                      : 'Very long sleep duration detected.'
                  }
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
        
        {hasFieldError('wake') && (
          <Text style={styles.errorText}>{getFieldError('wake')}</Text>
        )}
        {hasFieldError('sleep') && (
          <Text style={styles.errorText}>{getFieldError('sleep')}</Text>
        )}
      </GlassCard>
    );
  };
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        {/* Hero Section - Simplified Modern Design */}
        <HeroSection
          image={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80' }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          height={160}
        >
          <Text style={styles.title}>Personal Info</Text>
          <Text style={styles.subtitle}>
            Help us personalize your fitness journey
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons name="cloud-upload-outline" size={12} color={ResponsiveTheme.colors.success} />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}
        </HeroSection>
        
        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderNameSection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderDemographicsSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderLocationSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderOccupationSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderSleepScheduleSection()}
          </AnimatedSection>
        </View>
        
        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <GlassCard
              elevation={3}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.validationCard}
            >
              <View style={styles.validationTitleRow}>
                <Ionicons
                  name={validationResult.is_valid ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={validationResult.is_valid ? ResponsiveTheme.colors.secondary : ResponsiveTheme.colors.warning}
                />
                <Text style={[
                  styles.validationTitle,
                  validationResult.is_valid && styles.validationTitleSuccess
                ]}>
                  {validationResult.is_valid ? 'Ready to Continue' : 'Please Complete'}
                </Text>
              </View>
              <Text style={styles.validationPercentage}>
                {validationResult.completion_percentage}% Complete
              </Text>
              
              {/* DEBUG: Show current form data */}
              {__DEV__ && (
                <View style={styles.debugInfo}>
                  <Text style={styles.debugTitle}>Debug Info:</Text>
                  <Text style={styles.debugText}>Name: {formData.first_name} {formData.last_name}</Text>
                  <Text style={styles.debugText}>Age: {formData.age}</Text>
                  <Text style={styles.debugText}>Country: {formData.country}</Text>
                  <Text style={styles.debugText}>State: {formData.state}</Text>
                  <Text style={styles.debugText}>Valid: {validationResult.is_valid ? 'YES' : 'NO'}</Text>
                  <TouchableOpacity 
                    style={styles.debugButton}
                    onPress={() => {
                      console.log('[DEBUG] Manual validation trigger');
                      console.log('[DEBUG] Current formData:', formData);
                      // Force update parent state
                      const finalData = showCustomCountry && customCountry 
                        ? { ...formData, country: customCountry }
                        : formData;
                      onUpdate(finalData);
                    }}
                  >
                    <Text style={styles.debugButtonText}>Force Update</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error, index) => (
                    <Text key={index} style={styles.validationErrorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}
              
              {validationResult.warnings.length > 0 && (
                <View style={styles.validationWarnings}>
                  <Text style={styles.validationWarningTitle}>Recommendations:</Text>
                  {validationResult.warnings.map((warning, index) => (
                    <Text key={index} style={styles.validationWarningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>
        )}
      </ScrollView>
      
      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          {onNavigateToTab && (
            <Button
              title="Jump to Review"
              onPress={() => {
                // Save current changes before navigating
                const finalData = showCustomCountry && customCountry 
                  ? { ...formData, country: customCountry }
                  : formData;
                onUpdate(finalData);
                onNavigateToTab(5);
              }}
              variant="outline"
              style={styles.jumpButton}
            />
          )}
          <Button
            title="Next: Diet Preferences"
            onPress={() => {
              console.log('[NEXT] PersonalInfoTab: Next button pressed');
              console.log('[NEXT] Current form data:', formData);
              
              // Prepare final data including custom country if selected
              const finalData = showCustomCountry && customCountry 
                ? { ...formData, country: customCountry }
                : formData;
              
              // Update parent state for persistence
              onUpdate(finalData);
              
              // Pass current form data directly to validation to avoid state timing issues
              // This ensures we validate the actual form data, not potentially stale hook state
              onNext(finalData);
            }}
            variant="primary"
            style={styles.nextButton}
            loading={isLoading}
            pulse={validationResult?.is_valid || false}
          />
        </View>
      </View>
      
      {/* Time Picker Modals */}
      <TimePicker
        visible={showWakeTimePicker}
        initialTime={formData.wake_time}
        onTimeSelect={(time) => {
          handleTimeChange('wake_time', time);
          setShowWakeTimePicker(false);
        }}
        onClose={() => setShowWakeTimePicker(false)}
        title="Select Wake Up Time"
        is24Hour={true}
      />
      
      <TimePicker
        visible={showSleepTimePicker}
        initialTime={formData.sleep_time}
        onTimeSelect={(time) => {
          handleTimeChange('sleep_time', time);
          setShowSleepTimePicker(false);
        }}
        onClose={() => setShowSleepTimePicker(false)}
        title="Select Sleep Time"
        is24Hour={true}
      />
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: rh(12),
  },

  headerGradient: {
    paddingHorizontal: rw(16),
    paddingTop: rh(24),
    paddingBottom: rh(16),
    borderBottomLeftRadius: rw(24),
    borderBottomRightRadius: rw(24),
  },

  title: {
    fontSize: rf(24),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: rh(4),
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: rf(13),
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: rf(18),
    textAlign: 'center',
  },

  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(4),
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: rw(12),
    paddingVertical: rh(4),
    borderRadius: rw(16),
    marginTop: rh(8),
  },

  autoSaveText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  avatarContainer: {
    marginBottom: rh(12),
  },

  avatarCircle: {
    width: rw(64),
    height: rw(64),
    borderRadius: rw(32),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  content: {
    paddingHorizontal: rw(16),
    width: '100%',
  },

  section: {
    marginBottom: rh(16),
    width: '100%',
  },

  sectionTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: rh(12),
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: rf(13),
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: rh(12),
    lineHeight: rf(18),
  },

  row: {
    flexDirection: 'row',
    gap: rw(12),
    width: '100%',
  },

  halfWidth: {
    flex: 1,
    minWidth: 0,
  },

  fieldContainer: {
    marginBottom: rh(16),
    width: '100%',
  },

  inputLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: rh(8),
  },

  // Gender Selection - SegmentedControl
  genderSegmentedControl: {
    marginTop: rh(8),
  },

  genderContainer: {
    gap: rh(8),
  },

  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rh(10),
    paddingHorizontal: rw(12),
    borderRadius: rw(10),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    marginBottom: rh(4),
  },

  genderOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  genderIcon: {
    fontSize: rf(16),
    marginRight: rw(8),
  },

  genderOptionText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    flex: 1,
  },

  genderOptionTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  // Location Selection
  locationField: {
    marginBottom: rh(16),
    width: '100%',
  },

  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(8),
    marginTop: rh(4),
    width: '100%',
  },

  countryOption: {
    paddingVertical: rh(10),
    paddingHorizontal: rw(12),
    borderRadius: rw(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: rw(85),
    maxWidth: rw(110),
    alignItems: 'center',
  },

  countryOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },

  countryOptionText: {
    fontSize: rf(11),
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },

  countryOptionTextSelected: {
    color: '#A78BFA',
    fontWeight: '600',
  },

  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(8),
    marginTop: rh(4),
    width: '100%',
  },

  stateOption: {
    paddingVertical: rh(8),
    paddingHorizontal: rw(10),
    borderRadius: rw(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  stateOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },

  stateOptionText: {
    fontSize: rf(11),
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },

  stateOptionTextSelected: {
    color: '#A78BFA',
    fontWeight: '600',
  },

  // Occupation Selection - FeatureGrid
  occupationGrid: {
    marginVertical: rh(12),
  },

  occupationContainer: {
    gap: rh(8),
  },

  occupationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rh(12),
    paddingHorizontal: rw(12),
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    marginBottom: rh(8),
  },

  occupationOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  occupationIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    overflow: 'hidden',
    marginRight: rw(12),
  },

  occupationIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  occupationTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  occupationCheckmark: {
    marginLeft: rw(8),
  },

  occupationLabel: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: rh(2),
  },

  occupationLabelSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  occupationDescription: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(15),
  },

  occupationDescriptionSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  // Sleep Schedule
  timeSelector: {
    paddingVertical: rh(12),
    paddingHorizontal: rw(12),
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: 'center',
  },

  timeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(8),
  },

  timeText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  sleepDurationCard: {
    marginTop: rh(12),
    padding: rw(12),
  },

  sleepDurationHealthy: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 1,
  },

  sleepDurationWarning: {
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
  },

  sleepDurationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sleepDurationIconContainer: {
    marginRight: rw(12),
  },

  sleepDurationText: {
    flex: 1,
    minWidth: 0,
  },

  sleepDurationTitle: {
    fontSize: rf(14),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },

  sleepDurationSubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Validation
  validationSummary: {
    paddingHorizontal: rw(16),
    marginBottom: rh(16),
  },

  validationCard: {
    padding: rw(12),
  },

  validationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(8),
    marginBottom: rh(4),
  },

  validationTitle: {
    fontSize: rf(15),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  validationTitleSuccess: {
    color: ResponsiveTheme.colors.secondary,
  },

  validationPercentage: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: rh(12),
  },

  validationErrors: {
    marginBottom: rh(12),
  },

  validationErrorTitle: {
    fontSize: rf(12),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: rh(4),
  },

  validationErrorText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(16),
  },

  validationWarnings: {
    marginBottom: rh(12),
  },

  validationWarningTitle: {
    fontSize: rf(12),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: rh(4),
  },

  validationWarningText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.warning,
    lineHeight: rf(16),
  },

  errorText: {
    fontSize: rf(12),
    color: '#EF4444',
    marginTop: rh(4),
  },

  // Footer
  footer: {
    paddingHorizontal: rw(16),
    paddingVertical: rh(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 15, 26, 0.95)',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: rw(8),
  },

  backButton: {
    flex: 0.8,
  },

  jumpButton: {
    flex: 1,
  },

  nextButton: {
    flex: 1.5,
  },

  // Debug styles
  debugInfo: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    padding: rw(8),
    borderRadius: rw(8),
    marginTop: rh(12),
  },

  debugTitle: {
    fontSize: rf(12),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: rh(4),
  },

  debugText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: 'monospace',
  },

  debugButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    padding: rw(4),
    borderRadius: rw(4),
    marginTop: rh(8),
    alignSelf: 'center',
  },

  debugButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(10),
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
});

export default PersonalInfoTab;
