/**
 * Migration Integration Component
 * Provides complete migration UI integration with progress and conflict resolution
 * Automatically handles migration prompts and user interactions
 */

import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useMigration } from "../../hooks/useMigration";
import { useAuth } from "../../hooks/useAuth";
import { MigrationProgressModal } from "./MigrationProgressModal";
import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { SyncConflict, ConflictResolution } from "../../types/profileData";

interface MigrationIntegrationProps {
  autoPrompt?: boolean;
  showProgressModal?: boolean;
  onMigrationComplete?: (success: boolean) => void;
}

export const MigrationIntegration: React.FC<MigrationIntegrationProps> = ({
  autoPrompt = true,
  showProgressModal = true,
  onMigrationComplete,
}) => {
  const { user, isAuthenticated } = useAuth();
  const migration = useMigration();

  const [showProgress, setShowProgress] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [hasPrompted, setHasPrompted] = useState(false);

  // ============================================================================
  // AUTO-PROMPT MIGRATION
  // ============================================================================

  useEffect(() => {
    if (
      autoPrompt &&
      isAuthenticated &&
      user?.id &&
      migration.profileMigrationNeeded &&
      !hasPrompted &&
      !migration.isLoading
    ) {
      promptMigration();
      setHasPrompted(true);
    }
  }, [
    autoPrompt,
    isAuthenticated,
    user?.id,
    migration.profileMigrationNeeded,
    hasPrompted,
    migration.isLoading,
  ]);

  // ============================================================================
  // MIGRATION PROMPT
  // ============================================================================

  const promptMigration = () => {
    Alert.alert(
      "Sync Your Profile Data",
      "We found profile data on your device. Would you like to sync it to the cloud so you can access it from any device?",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () => {
            console.log("🚫 User declined migration");
          },
        },
        {
          text: "Sync Data",
          onPress: startMigration,
        },
      ],
    );
  };

  // ============================================================================
  // MIGRATION ACTIONS
  // ============================================================================

  const startMigration = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Please log in to sync your data");
      return;
    }

    try {
      if (showProgressModal) {
        setShowProgress(true);
      }

      await migration.startProfileMigration();

      // Handle migration result
      if (migration.result) {
        if (migration.result.success) {
          console.log("✅ Migration completed successfully");
          onMigrationComplete?.(true);

          if (showProgressModal) {
            // Auto-close progress modal after success
            setTimeout(() => {
              setShowProgress(false);
            }, 2000);
          }
        } else if (migration.result.conflicts?.length > 0) {
          console.log("⚖️ Migration conflicts detected");
          setConflicts(migration.result.conflicts);
          setShowProgress(false);
          setShowConflicts(true);
        } else {
          console.error("❌ Migration failed:", migration.result.errors);
          setShowProgress(false);
          onMigrationComplete?.(false);

          Alert.alert(
            "Migration Failed",
            `Failed to sync your data: ${migration.result.errors.join(", ")}`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: startMigration },
            ],
          );
        }
      }
    } catch (error) {
      console.error("❌ Migration error:", error);
      setShowProgress(false);
      onMigrationComplete?.(false);

      Alert.alert(
        "Sync Error",
        "An unexpected error occurred while syncing your data. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: startMigration },
        ],
      );
    }
  };

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  const handleConflictResolution = async (
    resolutions: ConflictResolution[],
  ) => {
    console.log("🔧 Resolving conflicts:", resolutions);

    setShowConflicts(false);

    try {
      // For now, we'll restart migration with the resolutions
      // TODO: Implement proper conflict resolution in migration manager

      if (showProgressModal) {
        setShowProgress(true);
      }

      // Apply resolutions and restart migration
      await migration.startProfileMigration();

      if (migration.result?.success) {
        console.log("✅ Migration completed after conflict resolution");
        onMigrationComplete?.(true);

        if (showProgressModal) {
          setTimeout(() => {
            setShowProgress(false);
          }, 2000);
        }
      } else {
        console.error("❌ Migration failed after conflict resolution");
        setShowProgress(false);
        onMigrationComplete?.(false);

        Alert.alert(
          "Migration Failed",
          "Failed to complete migration after resolving conflicts.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("❌ Conflict resolution error:", error);
      setShowProgress(false);
      onMigrationComplete?.(false);

      Alert.alert(
        "Resolution Error",
        "Failed to resolve conflicts. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  const handleProgressComplete = (success: boolean) => {
    setShowProgress(false);
    onMigrationComplete?.(success);

    if (!success) {
      Alert.alert(
        "Migration Failed",
        "Failed to sync your data. You can try again later from your profile settings.",
        [{ text: "OK" }],
      );
    }
  };

  const handleProgressCancel = () => {
    setShowProgress(false);

    Alert.alert(
      "Cancel Migration",
      "Are you sure you want to cancel the data sync? You can start it again later.",
      [
        { text: "Continue Sync", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => {
            // TODO: Implement migration cancellation
            console.log("🚫 Migration cancelled by user");
          },
        },
      ],
    );
  };

  const handleConflictCancel = () => {
    setShowConflicts(false);

    Alert.alert(
      "Skip Sync",
      "Your data will not be synced to the cloud. You can try again later from your profile settings.",
      [{ text: "OK" }],
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Migration Progress Modal */}
      {showProgressModal && (
        <MigrationProgressModal
          visible={showProgress}
          userId={user?.id || ""}
          onComplete={handleProgressComplete}
          onCancel={handleProgressCancel}
        />
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        visible={showConflicts}
        conflicts={conflicts}
        onResolve={handleConflictResolution}
        onCancel={handleConflictCancel}
      />
    </>
  );
};

// ============================================================================
// MIGRATION PROMPT COMPONENT
// ============================================================================

interface MigrationPromptProps {
  onStartMigration: () => void;
  onDismiss: () => void;
}

export const MigrationPrompt: React.FC<MigrationPromptProps> = ({
  onStartMigration,
  onDismiss,
}) => {
  useEffect(() => {
    Alert.alert(
      "Sync Your Data",
      "We found profile data on your device. Would you like to sync it to the cloud?",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: onDismiss,
        },
        {
          text: "Sync Data",
          onPress: onStartMigration,
        },
      ],
    );
  }, [onStartMigration, onDismiss]);

  return null;
};

export default MigrationIntegration;
