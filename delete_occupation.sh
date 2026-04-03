#!/bin/bash
# Remove from types
sed -i '/occupation_type/d' src/types/user.ts
sed -i '/occupation_type/d' src/types/onboarding.ts
sed -i '/occupation_type/d' src/types/onboarding/personal-info.ts
sed -i '/occupation_type/d' src/types/onboarding/legacy.ts

# Remove from store
sed -i '/occupation_type/d' src/stores/userStore.ts
sed -i '/occupation_type/d' src/stores/user/actions/helpers.ts

# Remove from validation
sed -i '/occupation_type/d' src/utils/validation.ts
sed -i '/occupation_type/d' src/utils/validation/utils.ts
sed -i '/occupation_type/d' src/services/validation/core.ts

# Remove from API/Transformers
sed -i '/occupation_type/d' src/services/aiRequestTransformers.ts
sed -i '/occupation_type/d' src/services/fitaiWorkersClient.ts
sed -i '/occupation_type/d' src/services/workersDataTransformers.ts
sed -i '/occupationType:/d' src/utils/typeTransformers.ts

# Remove from SyncEngine
sed -i '/occupation_type/d' src/services/SyncEngine.ts
sed -i '/occupationType/d' src/services/SyncEngine.ts
sed -i '/occupation_type/d' src/services/sync-engine/operations.ts
sed -i '/occupationType/d' src/services/sync-engine/operations.ts

# Remove from userProfile mappers
sed -i '/occupation_type/d' src/services/userProfile.ts
sed -i '/occupationType/d' src/services/userProfile.ts
sed -i '/occupation_type/d' src/services/user-profile/mappers.ts
sed -i '/occupationType/d' src/services/user-profile/mappers.ts

# Remove from Contexts
sed -i '/occupation_type/d' src/contexts/EditContext.tsx
sed -i '/occupation_type/d' src/contexts/edit/data-loaders.ts

