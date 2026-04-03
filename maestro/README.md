# FitAI Maestro E2E Tests

## Prerequisites

1. **Maestro CLI** installed (`maestro --version` should return 2.x+)
2. **Android device or emulator** connected (`adb devices` should list one)
3. **FitAI APK** installed on device (`bash build-both-apks.sh` then install)

## Running Tests

```bash
# Run all flows
maestro test maestro/flows/

# Run a single flow
maestro test maestro/flows/01_onboarding_guest.yaml

# Run with verbose output
maestro test --debug-output maestro/flows/01_onboarding_guest.yaml
```

## Test Flows

| Flow | Description |
|------|-------------|
| `01_onboarding_guest.yaml` | Guest signup → full 5-tab onboarding → main app |
| `02_main_app_navigation.yaml` | Bottom tabs: Home, Diet, Fitness, Profile |
| `03_workout_template_builder.yaml` | Create custom workout template, verify equipment filtering |
| `04_diet_generation.yaml` | Trigger diet plan generation, verify preferences used |

## Writing New Flows

- Use text matching (`tapOn: "Button Text"`) over testIDs where possible
- Each flow should be independent (start from a clean state or reset)
- See [Maestro docs](https://docs.maestro.dev) for YAML syntax
