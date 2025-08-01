import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/responsiveTheme';
import { Button, Card, THEME } from '../../components/ui';
import { Camera } from '../../components/advanced/Camera';
import { ImagePicker } from '../../components/advanced/ImagePicker';

export interface BodyAnalysis {
  photos: {
    front?: string;
    back?: string;
    side?: string;
  };
  analysis?: {
    bodyType: string;
    muscleMass: string;
    bodyFat: string;
    fitnessLevel: string;
    recommendations: string[];
  };
}

interface BodyAnalysisScreenProps {
  onNext: (data: BodyAnalysis) => void;
  onBack: () => void;
  onSkip: () => void;
  initialData?: Partial<BodyAnalysis>;
}

export const BodyAnalysisScreen: React.FC<BodyAnalysisScreenProps> = ({
  onNext,
  onBack,
  onSkip,
  initialData = {},
}) => {
  const [photos, setPhotos] = useState<BodyAnalysis['photos']>(
    initialData.photos || {}
  );
  const [analysis, setAnalysis] = useState<BodyAnalysis['analysis'] | null>(
    initialData.analysis || null
  );
  const [showCamera, setShowCamera] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<'front' | 'back' | 'side'>('front');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const photoTypes = [
    {
      type: 'front' as const,
      title: 'Front View',
      icon: '👤',
      description: 'Stand facing the camera',
      instruction: 'Stand straight, arms at your sides, facing the camera'
    },
    {
      type: 'back' as const,
      title: 'Back View',
      icon: '🔄',
      description: 'Turn around, back to camera',
      instruction: 'Turn around, arms at your sides, back facing the camera'
    },
    {
      type: 'side' as const,
      title: 'Side View',
      icon: '↔️',
      description: 'Turn sideways to camera',
      instruction: 'Turn to your side, arms at your sides, profile view'
    },
  ];

  const handleCameraCapture = (imageUri: string) => {
    setPhotos(prev => ({
      ...prev,
      [currentPhotoType]: imageUri
    }));
    setShowCamera(false);
  };

  const handleImagePickerSelect = (imageUris: string[]) => {
    if (imageUris.length > 0) {
      setPhotos(prev => ({
        ...prev,
        [currentPhotoType]: imageUris[0]
      }));
    }
    setShowImagePicker(false);
  };

  const openPhotoOptions = (photoType: 'front' | 'back' | 'side') => {
    setCurrentPhotoType(photoType);
    Alert.alert(
      'Add Photo',
      'How would you like to add your photo?',
      [
        { text: 'Camera', onPress: () => setShowCamera(true) },
        { text: 'Photo Library', onPress: () => setShowImagePicker(true) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removePhoto = (photoType: 'front' | 'back' | 'side') => {
    setPhotos(prev => {
      const newPhotos = { ...prev };
      delete newPhotos[photoType];
      return newPhotos;
    });
    // Clear analysis if photos are removed
    if (analysis) {
      setAnalysis(null);
    }
  };

  const analyzePhotos = async () => {
    const photoCount = Object.keys(photos).length;
    if (photoCount === 0) {
      Alert.alert('No Photos', 'Please add at least one photo to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis for now
      // TODO: Integrate with Google Gemini Vision API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = {
        bodyType: 'Mesomorph',
        muscleMass: 'Moderate',
        bodyFat: '15-20%',
        fitnessLevel: 'Intermediate',
        recommendations: [
          'Focus on strength training to build lean muscle',
          'Incorporate cardio 3-4 times per week',
          'Maintain a balanced diet with adequate protein',
          'Consider progressive overload in your workouts'
        ]
      };

      setAnalysis(mockAnalysis);
      Alert.alert(
        'Analysis Complete! 🎯',
        'Your body analysis is ready. Review the results below.',
        [{ text: 'Great!' }]
      );
    } catch (error) {
      Alert.alert('Analysis Failed', 'Unable to analyze photos. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    onNext({
      photos,
      analysis: analysis || undefined,
    });
  };

  const photoCount = Object.keys(photos).length;
  const hasAllPhotos = photoCount === 3;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Body Analysis</Text>
          <Text style={styles.subtitle}>
            Take photos for AI-powered body composition analysis
          </Text>
        </View>

        <View style={styles.content}>
          {/* Photo Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo Guidelines</Text>
            <Card style={styles.instructionCard}>
              <Text style={styles.instructionText}>
                • Wear form-fitting clothes or workout attire{'\n'}
                • Ensure good lighting{'\n'}
                • Stand against a plain background{'\n'}
                • Keep arms at your sides{'\n'}
                • Take photos from about 6 feet away
              </Text>
            </Card>
          </View>

          {/* Photo Capture */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photos ({photoCount}/3) {hasAllPhotos && '✅'}
            </Text>
            <View style={styles.photoGrid}>
              {photoTypes.map((photoType) => (
                <View key={photoType.type} style={styles.photoItem}>
                  <TouchableOpacity
                    style={styles.photoCard}
                    onPress={() => openPhotoOptions(photoType.type)}
                  >
                    <Card style={styles.photoCardInner} variant="outlined">
                      {photos[photoType.type] ? (
                        <View style={styles.photoPreview}>
                          <Image
                            source={{ uri: photos[photoType.type] }}
                            style={styles.photoImage}
                          />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => removePhoto(photoType.type)}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Text style={styles.photoIcon}>{photoType.icon}</Text>
                          <Text style={styles.photoTitle}>{photoType.title}</Text>
                          <Text style={styles.photoDescription}>
                            {photoType.description}
                          </Text>
                          <Text style={styles.addPhotoText}>Tap to add</Text>
                        </View>
                      )}
                    </Card>
                  </TouchableOpacity>
                  <Text style={styles.photoInstruction}>
                    {photoType.instruction}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Analysis Button */}
          {photoCount > 0 && !analysis && (
            <View style={styles.section}>
              <Button
                title={isAnalyzing ? 'Analyzing...' : '🤖 Analyze Photos'}
                onPress={analyzePhotos}
                variant="secondary"
                loading={isAnalyzing}
                disabled={isAnalyzing}
              />
            </View>
          )}

          {/* Analysis Results */}
          {analysis && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analysis Results 🎯</Text>
              <Card style={styles.analysisCard}>
                <View style={styles.analysisGrid}>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Body Type</Text>
                    <Text style={styles.analysisValue}>{analysis.bodyType}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Muscle Mass</Text>
                    <Text style={styles.analysisValue}>{analysis.muscleMass}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Body Fat</Text>
                    <Text style={styles.analysisValue}>{analysis.bodyFat}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Fitness Level</Text>
                    <Text style={styles.analysisValue}>{analysis.fitnessLevel}</Text>
                  </View>
                </View>
                
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>Recommendations</Text>
                  {analysis.recommendations.map((rec, index) => (
                    <Text key={index} style={styles.recommendationItem}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              </Card>
            </View>
          )}

          {/* Skip Option */}
          <View style={styles.section}>
            <TouchableOpacity onPress={onSkip}>
              <Text style={styles.skipText}>
                Skip body analysis (you can add photos later)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Next"
            onPress={handleNext}
            variant="primary"
            style={styles.nextButton}
          />
        </View>
      </View>

      {/* Camera Modal */}
      {showCamera && (
        <Camera
          mode="progress"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Image Picker Modal */}
      <ImagePicker
        visible={showImagePicker}
        mode="single"
        onImagesSelected={handleImagePickerSelect}
        onClose={() => setShowImagePicker(false)}
        allowsEditing={true}
        aspect={[3, 4]}
        quality={0.8}
      />
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

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  instructionCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  instructionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  photoGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  photoItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  photoCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  photoCardInner: {
    minHeight: rh(120),
  },

  photoPreview: {
    position: 'relative',
    height: rh(120),
  },

  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  removePhotoButton: {
    position: 'absolute',
    top: ResponsiveTheme.spacing.sm,
    right: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.error,
    borderRadius: ResponsiveTheme.borderRadius.full,
    width: rw(24),
    height: rh(24),
    alignItems: 'center',
    justifyContent: 'center',
  },

  removePhotoText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: ResponsiveTheme.spacing.md,
    minHeight: rh(120),
  },

  photoIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  photoTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  photoDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  addPhotoText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  photoInstruction: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  analysisCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  analysisItem: {
    width: '48%',
    alignItems: 'center',
  },

  analysisLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  analysisValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
  },

  recommendationsSection: {
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  recommendationsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  recommendationItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  skipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  nextButton: {
    flex: 2,
  },
});
