import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CookingVideo } from "../../services/youtubeVideoService";

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
      <View style={styles.videoSection}>
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading cooking video...</Text>
        </View>
      </View>
    );
  }

  if (cookingVideo) {
    return (
      <View style={styles.videoSection}>
        <View style={styles.videoContainer}>
          <TouchableOpacity
            style={styles.videoPreview}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
            activeOpacity={0.8}
          >
            {cookingVideo.thumbnails && cookingVideo.thumbnails.length > 0 ? (
              <Image
                source={{ uri: cookingVideo.thumbnails[0].url }}
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholderThumb}>
                <Ionicons name="videocam" size={48} color="#6B7280" />
              </View>
            )}
            <View style={styles.playButton}>
              <Ionicons name="play" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.videoDuration}>
              <Text style={styles.videoDurationText}>
                {Math.floor(cookingVideo.lengthSeconds / 60)}:
                {(cookingVideo.lengthSeconds % 60).toString().padStart(2, "0")}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.videoTitle}>{cookingVideo.title}</Text>
          <Text style={styles.videoAuthor}>by {cookingVideo.author}</Text>
          <TouchableOpacity
            style={styles.watchVideoButton}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
          >
            <Ionicons name="play-circle" size={20} color="#4F46E5" />
            <Text style={styles.watchVideoText}>Watch Cooking Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.videoSection}>
      <View style={styles.videoError}>
        <Ionicons name="videocam-off" size={48} color="#6B7280" />
        <Text style={styles.errorText}>{videoError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  videoSection: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  videoContainer: {
    padding: 16,
  },
  videoPreview: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
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
    backgroundColor: "#F3F4F6",
  },
  playButton: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  watchVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  watchVideoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    marginLeft: 8,
  },
  videoPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  videoError: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  videoAuthor: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
