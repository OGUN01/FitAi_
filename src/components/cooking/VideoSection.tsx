import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingVideo } from "../../services/youtubeVideoService";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from '../../utils/responsive';
import { GlassCard } from "../ui/aurora";
import { AnimatedPressable } from "../ui/aurora";
import { AuroraSpinner } from "../ui/aurora";

interface VideoSectionProps {
  cookingVideo: CookingVideo | null;
  isLoadingVideo: boolean;
  videoError: string | null;
  onRetry: () => void;
}

export default function VideoSection({
  cookingVideo,
  isLoadingVideo,
  videoError,
  onRetry,
}: VideoSectionProps) {
  if (isLoadingVideo) {
    return (
      <GlassCard padding="none" borderRadius="xl" style={styles.videoSection}>
        <View style={styles.videoPlaceholder}>
          <AuroraSpinner size="lg" theme="primary" />
          <Text style={styles.loadingText}>Loading cooking video...</Text>
        </View>
      </GlassCard>
    );
  }

  if (cookingVideo) {
    return (
      <GlassCard padding="lg" borderRadius="xl" style={styles.videoSection}>
        <View style={styles.videoContainer}>
          <AnimatedPressable
            style={styles.videoPreview}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
            scaleValue={0.98}
            springConfig="smooth"
            hapticType="light"
            accessibilityLabel="Open cooking video on YouTube"
            accessibilityRole="button"
          >
            {cookingVideo.thumbnails && cookingVideo.thumbnails.length > 0 ? (
              <Image
                source={{ uri: cookingVideo.thumbnails[0].url }}
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholderThumb}>
                <Ionicons
                  name="videocam"
                  size={48}
                  color={colors.text.secondary}
                />
              </View>
            )}
            <View style={styles.playButton}>
              <Ionicons name="play" size={32} color={colors.text.primary} />
            </View>
            <View style={styles.videoDuration}>
              <Text style={styles.videoDurationText}>
                {Math.floor(cookingVideo.lengthSeconds / 60)}:
                {(cookingVideo.lengthSeconds % 60).toString().padStart(2, "0")}
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={styles.videoTitle}>{cookingVideo.title}</Text>
          <Text style={styles.videoAuthor}>by {cookingVideo.author}</Text>
          <AnimatedPressable
            style={styles.watchVideoButton}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
            scaleValue={0.96}
            springConfig="smooth"
            hapticType="light"
            accessibilityLabel="Watch cooking tutorial on YouTube"
            accessibilityRole="button"
          >
            <Ionicons
              name="play-circle"
              size={20}
              color={colors.primary.DEFAULT}
            />
            <Text style={styles.watchVideoText}>Watch Cooking Tutorial</Text>
          </AnimatedPressable>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none" borderRadius="xl" style={styles.videoSection}>
      <View style={styles.videoError}>
        <Ionicons name="videocam-off" size={48} color={colors.text.secondary} />
        <Text style={styles.errorText}>{videoError}</Text>
        <AnimatedPressable
          style={styles.retryButton}
          onPress={onRetry}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="light"
          accessibilityLabel="Retry loading video"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  videoSection: {
    marginBottom: rp(16),
  },
  videoContainer: {
    width: "100%",
  },
  videoPreview: {
    height: 200,
    borderRadius: rbr(12),
    overflow: "hidden",
    backgroundColor: colors.background.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: rp(12),
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholderThumb: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
  },
  playButton: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: rbr(32),
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderRadius: rbr(4),
  },
  videoDurationText: {
    color: colors.text.primary,
    fontSize: rf(12),
    fontWeight: "600",
  },
  watchVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    paddingHorizontal: rp(16),
    paddingVertical: rp(10),
    borderRadius: rbr(8),
    marginTop: rp(8),
  },
  watchVideoText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    marginLeft: rp(8),
  },
  videoPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
  },
  loadingText: {
    marginTop: rp(12),
    fontSize: rf(16),
    color: colors.text.secondary,
  },
  videoError: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    padding: rp(20),
  },
  errorText: {
    fontSize: rf(16),
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: rp(8),
    marginBottom: rp(16),
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: rp(20),
    paddingVertical: rp(10),
    borderRadius: rbr(8),
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: rf(16),
    fontWeight: "600",
  },
  videoTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: rp(12),
  },
  videoAuthor: {
    fontSize: rf(14),
    color: colors.text.secondary,
    marginTop: rp(4),
  },
});
