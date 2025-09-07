// HealthKit Settings Screen
// Allows users to configure health data integration preferences

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealthKitSync } from '../../hooks/useHealthKitSync';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';

interface HealthDataType {
  key: keyof ReturnType<typeof useHealthKitSync>['settings']['dataTypesToSync'];
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const HEALTH_DATA_TYPES: HealthDataType[] = [
  {
    key: 'steps',
    title: 'Steps & Activity',
    description: 'Daily steps, distance, and movement data',
    icon: 'walk-outline',
  },
  {
    key: 'heartRate',
    title: 'Heart Rate',
    description: 'Heart rate measurements and variability',
    icon: 'heart-outline',
  },
  {
    key: 'workouts',
    title: 'Workouts',
    description: 'Exercise sessions and fitness activities',
    icon: 'fitness-outline',
  },
  {
    key: 'sleep',
    title: 'Sleep Data',
    description: 'Sleep duration, quality, and patterns',
    icon: 'bed-outline',
  },
  {
    key: 'weight',
    title: 'Body Measurements',
    description: 'Weight, body fat, and composition',
    icon: 'body-outline',
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    description: 'Calories, macros, and dietary information',
    icon: 'nutrition-outline',
  },
];

export const HealthKitSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    syncStatus,
    error,
    lastSyncTime,
    healthMetrics,
    settings,
    initialize,
    requestPermissions,
    syncNow,
    updateSettings,
    getHealthSummary,
  } = useHealthKitSync();

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    // Load health summary when screen mounts
    const loadSummary = async () => {
      if (isAuthorized) {
        setLoadingSummary(true);
        try {
          const summaryData = await getHealthSummary();
          setSummary(summaryData);
        } catch (error) {
          console.error('Failed to load health summary:', error);
        } finally {
          setLoadingSummary(false);
        }
      }
    };
    
    loadSummary();
  }, [isAuthorized, getHealthSummary]);

  const handleToggleHealthKit = async (enabled: boolean) => {
    if (enabled) {
      if (!isAvailable) {
        Alert.alert(
          'HealthKit Unavailable',
          'HealthKit is not available on this device. This feature requires an iOS device with HealthKit support.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!isAuthorized) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'To use HealthKit integration, please grant permissions in the Health app or try again.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }

    updateSettings({ healthKitEnabled: enabled });
  };

  const handleDataTypeToggle = (dataType: keyof typeof settings.dataTypesToSync, enabled: boolean) => {
    updateSettings({
      dataTypesToSync: {
        ...settings.dataTypesToSync,
        [dataType]: enabled,
      },
    });
  };

  const handleSyncNow = async () => {
    try {
      await syncNow(true);
      Alert.alert('Sync Complete', 'Your health data has been synchronized successfully.');
      
      // Refresh summary
      const summaryData = await getHealthSummary();
      setSummary(summaryData);
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to sync health data. Please try again.');
    }
  };

  const handleOpenHealthApp = () => {
    Alert.alert(
      'Open Health App',
      'To manage detailed HealthKit permissions, please open the Health app on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK' },
      ]
    );
  };

  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return 'Never';
    
    const now = new Date();
    const sync = new Date(syncTime);
    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'success': return THEME.colors.success;
      case 'error': return THEME.colors.error;
      case 'syncing': return THEME.colors.warning;
      default: return THEME.colors.text;
    }
  };

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="phone-portrait-outline" size={64} color={THEME.colors.textSecondary} />
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: THEME.colors.text,
            marginTop: 16,
            textAlign: 'center'
          }}>
            HealthKit Not Available
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: THEME.colors.textSecondary,
            marginTop: 8,
            textAlign: 'center'
          }}>
            HealthKit integration is only available on iOS devices. 
            Android users can manually track their progress in FitAI.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: THEME.colors.border,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: THEME.colors.text,
          flex: 1,
        }}>
          HealthKit Settings
        </Text>
        <Ionicons name="fitness-outline" size={24} color={THEME.colors.primary} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Main Toggle */}
        <View style={{
          backgroundColor: THEME.colors.surface,
          margin: 16,
          borderRadius: 12,
          padding: 16,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: THEME.colors.text,
              }}>
                Enable HealthKit Integration
              </Text>
              <Text style={{
                fontSize: 14,
                color: THEME.colors.textSecondary,
                marginTop: 4,
              }}>
                Sync your health data with Apple Health
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color={THEME.colors.primary} />
            ) : (
              <Switch
                value={settings.healthKitEnabled && isAuthorized}
                onValueChange={handleToggleHealthKit}
                trackColor={{
                  false: THEME.colors.border,
                  true: THEME.colors.primary,
                }}
              />
            )}
          </View>
          
          {/* Status Information */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: THEME.colors.border,
          }}>
            <Ionicons 
              name={isAuthorized ? 'checkmark-circle' : 'alert-circle'} 
              size={16} 
              color={isAuthorized ? THEME.colors.success : THEME.colors.warning} 
            />
            <Text style={{
              fontSize: 14,
              color: isAuthorized ? THEME.colors.success : THEME.colors.warning,
              marginLeft: 8,
            }}>
              {isAuthorized ? 'Connected to HealthKit' : 'Not connected'}
            </Text>
          </View>
        </View>

        {/* Sync Status */}
        {isAuthorized && (
          <View style={{
            backgroundColor: THEME.colors.surface,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 12,
            padding: 16,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: THEME.colors.text,
              }}>
                Sync Status
              </Text>
              <TouchableOpacity
                onPress={handleSyncNow}
                disabled={syncStatus === 'syncing'}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: THEME.colors.primary,
                  borderRadius: 8,
                  opacity: syncStatus === 'syncing' ? 0.6 : 1,
                }}
              >
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="refresh" size={16} color="white" />
                )}
                <Text style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600',
                  marginLeft: 4,
                }}>
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={THEME.colors.textSecondary} 
              />
              <Text style={{
                fontSize: 14,
                color: THEME.colors.textSecondary,
                marginLeft: 8,
              }}>
                Last sync: {formatLastSync(lastSyncTime)}
              </Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons 
                name={syncStatus === 'success' ? 'checkmark-circle' : 
                     syncStatus === 'error' ? 'alert-circle' : 
                     syncStatus === 'syncing' ? 'time' : 'help-circle'} 
                size={16} 
                color={getSyncStatusColor()} 
              />
              <Text style={{
                fontSize: 14,
                color: getSyncStatusColor(),
                marginLeft: 8,
                flex: 1,
              }}>
                {syncStatus === 'success' ? 'Sync successful' :
                 syncStatus === 'error' ? (error || 'Sync failed') :
                 syncStatus === 'syncing' ? 'Syncing data...' :
                 'Ready to sync'}
              </Text>
            </View>
          </View>
        )}

        {/* Health Summary */}
        {isAuthorized && summary && (
          <View style={{
            backgroundColor: THEME.colors.surface,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 12,
            padding: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: THEME.colors.text,
              marginBottom: 12,
            }}>
              Today's Health Summary
            </Text>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}>
              <View style={{ alignItems: 'center', minWidth: '45%', marginBottom: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: THEME.colors.primary }}>
                  {summary.dailySteps?.toLocaleString() || '0'}
                </Text>
                <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>Steps</Text>
              </View>
              
              <View style={{ alignItems: 'center', minWidth: '45%', marginBottom: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: THEME.colors.secondary }}>
                  {summary.dailyCalories || '0'}
                </Text>
                <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>Calories</Text>
              </View>
              
              {summary.lastWeight && (
                <View style={{ alignItems: 'center', minWidth: '45%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: THEME.colors.success }}>
                    {summary.lastWeight.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>kg</Text>
                </View>
              )}
              
              {summary.sleepHours && (
                <View style={{ alignItems: 'center', minWidth: '45%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: THEME.colors.info }}>
                    {summary.sleepHours.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>Sleep (h)</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Data Types */}
        {isAuthorized && (
          <View style={{
            backgroundColor: THEME.colors.surface,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 12,
            padding: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: THEME.colors.text,
              marginBottom: 12,
            }}>
              Data Types to Sync
            </Text>
            
            {HEALTH_DATA_TYPES.map((dataType, index) => (
              <View key={dataType.key} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: THEME.colors.border,
              }}>
                <Ionicons 
                  name={dataType.icon} 
                  size={24} 
                  color={THEME.colors.primary} 
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: THEME.colors.text,
                  }}>
                    {dataType.title}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: THEME.colors.textSecondary,
                    marginTop: 2,
                  }}>
                    {dataType.description}
                  </Text>
                </View>
                <Switch
                  value={settings.dataTypesToSync[dataType.key]}
                  onValueChange={(value) => handleDataTypeToggle(dataType.key, value)}
                  trackColor={{
                    false: THEME.colors.border,
                    true: THEME.colors.primary,
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* Additional Settings */}
        {isAuthorized && (
          <View style={{
            backgroundColor: THEME.colors.surface,
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 12,
            padding: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: THEME.colors.text,
              marginBottom: 12,
            }}>
              Additional Settings
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: THEME.colors.text,
                }}>
                  Export FitAI Data to HealthKit
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: THEME.colors.textSecondary,
                  marginTop: 2,
                }}>
                  Share your FitAI workouts and nutrition with Health app
                </Text>
              </View>
              <Switch
                value={settings.exportToHealthKit}
                onValueChange={(value) => updateSettings({ exportToHealthKit: value })}
                trackColor={{
                  false: THEME.colors.border,
                  true: THEME.colors.primary,
                }}
              />
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: THEME.colors.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: THEME.colors.text,
                }}>
                  Background Sync
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: THEME.colors.textSecondary,
                  marginTop: 2,
                }}>
                  Automatically sync when app becomes active
                </Text>
              </View>
              <Switch
                value={settings.backgroundSyncEnabled}
                onValueChange={(value) => updateSettings({ backgroundSyncEnabled: value })}
                trackColor={{
                  false: THEME.colors.border,
                  true: THEME.colors.primary,
                }}
              />
            </View>
          </View>
        )}

        {/* Help Button */}
        <View style={{
          marginHorizontal: 16,
          marginBottom: 32,
        }}>
          <TouchableOpacity
            onPress={handleOpenHealthApp}
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: THEME.colors.border,
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color={THEME.colors.primary} />
            <Text style={{
              fontSize: 16,
              color: THEME.colors.primary,
              marginLeft: 8,
            }}>
              Manage Permissions in Health App
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};