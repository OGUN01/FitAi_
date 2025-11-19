# FitAI - World-Class UI Redesign Documentation

## Project Overview

Complete UI/UX redesign of FitAI application to achieve world-class fitness app design standards, surpassing industry leaders including cult.fit, Nike Training Club, Peloton, and MyFitnessPal.

**Scope**: Full application redesign including onboarding flow (5 tabs) and main application screens (5 core screens)

**Design Philosophy**: Aurora-inspired design language with glassmorphism, dynamic backgrounds, immersive media, bold typography, and high-performance micro-interactions.

**Target Performance**: 60-120fps animations, sub-300ms interaction response times, optimized for all device capabilities.

---

## Design System Research Summary

### Industry Analysis

**Cult.fit Aurora Design Language**
- Design system name: Aurora (inspired by northern lights)
- Core principles: Bold, Energetic, Immersive, Intent-Driven, Simply Efficient, Break the Mould
- Visual approach: Dynamic animated gradient backgrounds, glassmorphic surfaces, immersive motion
- Technical stack: Migrated from React Native to Flutter for glassmorphism support
- Architecture: Atomic design methodology (sub-atomic particles, atoms, molecules, organisms, templates)
- Motion philosophy: Functional motion that retains context, drives attention, increases visual impact

**Nike Training Club UI Patterns**
- Clean, high-contrast interface minimizing workout distractions
- Instructor-led video classes with real-time demonstrations
- Multiple format options: video, audio-only, timer modes
- Logical content sectioning with brief fitness assessments
- Seamless wearable integration

**Peloton Design Elements**
- Bottom navigation bar for primary actions
- Customizable dashboards with progress tracking
- Gamification: leaderboards, badges, achievement systems
- Live and on-demand class interfaces
- Real-time performance tracking
- Community-driven workout features

**MyFitnessPal UX Patterns**
- Extensive database interfaces with barcode scanning
- Comprehensive metric tracking dashboards
- Personalized reminders and adaptive recommendations
- Integration patterns with third-party services

### 2025 Mobile Design Trends

**Animations & Micro-interactions**
- Micro-interactions present in nearly every modern app
- Smooth transitions between screens with contextual animations
- Responsive feedback: button ripples, swipe animations, pull-to-refresh
- Motion design personalization based on user behavior
- Dynamic animations: scroll-triggered effects, animated onboarding
- Immersive micro-interactions with smoother transitions
- Performance requirement: Animations feel fluid and responsive

**Visual Trends**
- 3D elements: animations, icons, interactive visuals
- AI-powered personalization based on user behavior
- Minimalist design with bold typography
- AR/VR integration for immersive experiences
- Dark mode optimization for reduced eye strain
- Glassmorphism and liquid glass UI effects
- High-contrast interfaces for various lighting conditions

**UX Principles**
- Touch-friendly buttons for effortless interaction
- Consistent branding and UI elements (80% brand positioning increase)
- Clear, motivational copywriting (25% session completion rate increase)
- Avoiding decorative UI elements that distract
- Uniform color schemes, typography, tone of voice
- Flow state optimization: reduce distractions, guide actions seamlessly

---

## Technology Stack Selection

### Component Libraries

**Primary: Gluestack UI v2**
- React Native equivalent of shadcn/ui
- 20,000+ GitHub stars, 200+ contributors
- NativeBase's modern successor
- 40+ pre-built components with customizable patterns
- Tailwind CSS utility classes via NativeWind integration
- Suited for enterprise applications and strict design systems
- Copy-paste component architecture
- Status: Selected for implementation

**Alternative Considered: Tamagui**
- Performance-focused with optimizing compiler
- Cross-platform (truly universal web + mobile)
- Advanced theming capabilities
- Sophisticated compiler: CSS extraction, tree flattening, dead code elimination
- Steep learning curve for newcomers
- Not compatible with atomic CSS libraries like NativeWind
- Decision: Not selected (Gluestack UI chosen for Tailwind integration)

**NativeWind v4**
- Tailwind CSS for React Native
- Utility-first styling approach
- Performance comparable to native StyleSheet
- Already installed in project (v4.1.23)
- Requires complete configuration
- Status: Will be fully configured and activated

### Animation Libraries

**React Native Reanimated 3**
- Industry standard for high-performance animations
- JavaScript worklets running on UI thread (eliminates bridge overhead)
- 60-120fps animation capability
- 3x faster than standard React Native animations
- Deep integration with React Native Gesture Handler
- Layout animations and shared element transitions
- Seamless screen transitions (Instagram/Pinterest-style)
- Status: Check if installed, install if missing

**Animation Capabilities Required**
- Gesture-based interactions: swipe-to-delete, draggable elements, pinch-to-zoom
- Micro-interactions: loading spinners, success indicators, icon animations
- Complex animations: screen transitions, parallax effects
- Direct manipulation interfaces with zero perceptible lag
- Spring physics for natural movement

### Visual Effect Libraries

**@react-native-community/blur**
- Primary library for glassmorphism effects
- BlurView component for frosted glass appearance
- Performance optimization via renderToHardwareTextureAndroid
- Device capability detection for dynamic blur intensity
- Essential for Aurora design language implementation
- Status: Must install

**react-native-linear-gradient**
- Dynamic gradient backgrounds
- Aurora effect (northern lights-inspired gradients)
- Required for hero cards, buttons, overlays
- Status: Must install

**react-native-svg**
- Custom icons and illustrations
- Scalable graphics for all screen densities
- Icon animations support
- Status: Check if installed

**react-native-skia (Optional)**
- Advanced graphics rendering
- Liquid glass UI effects
- Complex visual effects
- Higher performance overhead
- Status: Optional, evaluate during implementation

### Supporting Libraries

**react-native-gesture-handler**
- Gesture recognition system
- Integrates with Reanimated 3
- Swipe, pan, pinch, long-press gestures
- Status: Check if installed

**Haptic Feedback**
- Light impact for selections
- Success/error notifications
- Button press feedback
- Enhance tactile user experience

---

## Design System Specifications

### Color System

**Primary Palette**
```
Primary Gradient: #FF6B35 → #FF8A5C (Vibrant Orange/Coral)
Secondary Gradient: #00D4FF → #00FFFF (Electric Cyan)
```

**Aurora Background Themes (4 Dynamic Variants)**
```
Deep Space:
  - Base: #0A0F1C
  - Mid: #1A1F2E
  - Highlight: #252A3A

Cosmic Purple:
  - Base: #1C0A1F
  - Mid: #2E1A2F
  - Highlight: #3A252F

Ocean Deep:
  - Base: #0A1F1C
  - Mid: #1A2F2E
  - Highlight: #253A3A

Northern Lights:
  - Multi-color animated gradient
  - Dynamic movement (like Aurora Borealis)
```

**Glass Surface Specifications**
```
Background: rgba(255, 255, 255, 0.1)
Blur Radius: 20px
Border: rgba(255, 255, 255, 0.18)
Shadow: 0 8px 32px rgba(0, 0, 0, 0.37)
```

**Status Colors**
```
Success: #4CAF50
Warning: #FF9800
Error: #F44336
Info: #2196F3
```

**Text Colors**
```
Primary: #FFFFFF
Secondary: #B0B0B0
Muted: #8A8A8A
Disabled: #5A5A5A
```

### Typography Scale

**Font Sizes**
```
Display: 48px (bold) - Hero headings
H1: 32px (bold) - Primary headings
H2: 24px (semibold) - Section headings
H3: 20px (medium) - Subsection headings
Body: 16px (regular) - Primary content
Caption: 14px (regular) - Supporting text
Micro: 12px (regular) - Labels, metadata
```

**Font Weights**
```
Light: 300
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
Extrabold: 800
```

**Line Heights**
```
Tight: 1.2 (headings)
Normal: 1.5 (body text)
Relaxed: 1.75 (long-form content)
```

### Spacing System (8pt Grid)

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
xxxl: 64px
```

**Application Guidelines**
- Component padding: Use md (16px) as default
- Section margins: Use lg (24px) or xl (32px)
- Card internal spacing: md to lg
- Icon spacing: sm (8px)
- Screen padding: md to lg based on content density

### Elevation & Shadow System

**8-Level Shadow System**
```
Level 1 (Subtle):
  - shadowOffset: { width: 0, height: 1 }
  - shadowRadius: 2
  - shadowOpacity: 0.1

Level 2 (Low):
  - shadowOffset: { width: 0, height: 2 }
  - shadowRadius: 4
  - shadowOpacity: 0.15

Level 3 (Medium Low):
  - shadowOffset: { width: 0, height: 4 }
  - shadowRadius: 8
  - shadowOpacity: 0.2

Level 4 (Medium):
  - shadowOffset: { width: 0, height: 6 }
  - shadowRadius: 12
  - shadowOpacity: 0.25

Level 5 (Medium High):
  - shadowOffset: { width: 0, height: 8 }
  - shadowRadius: 16
  - shadowOpacity: 0.3

Level 6 (High):
  - shadowOffset: { width: 0, height: 12 }
  - shadowRadius: 24
  - shadowOpacity: 0.35

Level 7 (Very High):
  - shadowOffset: { width: 0, height: 16 }
  - shadowRadius: 32
  - shadowOpacity: 0.4

Level 8 (Extreme):
  - shadowOffset: { width: 0, height: 24 }
  - shadowRadius: 48
  - shadowOpacity: 0.45
```

**Usage Guidelines**
- Level 1-2: Subtle cards, inputs
- Level 3-4: Standard cards, buttons
- Level 5-6: Elevated modals, floating action buttons
- Level 7-8: Critical overlays, dialogs

### Border Radius System

```
sm: 4px - Small chips, badges
md: 8px - Buttons, inputs
lg: 12px - Standard cards
xl: 16px - Large cards
xxl: 24px - Hero cards
full: 9999px - Circular elements
```

### Animation Constants

**Duration**
```
instant: 100ms
quick: 200ms
normal: 300ms
slow: 500ms
verySlow: 800ms
```

**Easing Curves**
```
easeIn: cubic-bezier(0.4, 0, 1, 1)
easeOut: cubic-bezier(0, 0, 0.2, 1)
easeInOut: cubic-bezier(0.4, 0, 0.2, 1)
spring: { damping: 15, stiffness: 100 }
bounce: { damping: 10, stiffness: 80 }
```

**Animation Types**
```
Scale: 0.95 to 1.0 for press states
Opacity: 0 to 1 for fade effects
Translate: -100% to 0% for slide effects
Rotate: 0deg to 360deg for loading spinners
```

---

## Component Library Architecture

### Gluestack UI Components (40+ Pre-built)

**Layout Components**
- Box: Base container with Tailwind utilities
- VStack: Vertical stack layout
- HStack: Horizontal stack layout
- Center: Centered content container
- Divider: Visual separators

**Form Components**
- Button: Multiple variants (solid, outline, ghost, link)
- Input: Text input with floating labels
- Textarea: Multi-line text input
- Select: Dropdown selection
- Checkbox: Multi-select options
- Radio: Single-select options
- Switch: Toggle controls
- Slider: Range selection

**Feedback Components**
- Alert: Status messages
- Toast: Temporary notifications
- Progress: Linear progress indicator
- Spinner: Loading indicator
- Skeleton: Loading placeholders

**Data Display**
- Badge: Status indicators
- Avatar: User profile images
- Card: Content containers
- List: Item collections
- Table: Tabular data
- Tooltip: Contextual information

**Overlay Components**
- Modal: Full-screen overlays
- BottomSheet: Bottom-anchored sheets
- Popover: Contextual overlays
- Menu: Action menus
- ActionSheet: Mobile-style action lists

**Navigation**
- Tabs: Tab navigation
- Breadcrumb: Hierarchical navigation

### Custom Aurora Components

**AuroraBackground**
- Animated gradient container
- 4 theme variants (Deep Space, Cosmic Purple, Ocean Deep, Northern Lights)
- Smooth color transitions
- Performance optimized for continuous animation
- Props: theme, animationSpeed, intensity

**GlassCard**
- Glassmorphic card component
- Blur effect with transparency
- Optional gradient border
- Elevation levels 1-8
- Props: blurIntensity, elevation, borderGradient, padding

**GlassView**
- Reusable blur container
- Wraps any content with glass effect
- Optimized rendering performance
- Props: blurType, blurAmount, overlayColor

**HeroSection**
- Large imagery with gradient overlay
- Text content positioning (top, center, bottom)
- Parallax scrolling support
- Props: image, overlayGradient, contentPosition, parallaxEnabled

**AnimatedIcon**
- Icons with built-in micro-interactions
- Spring animation on press
- Customizable animation types
- Props: icon, animationType, onPress, size

**ProgressRing**
- Circular progress indicator
- Animated fill with easing
- Gradient stroke support
- Center content slot
- Props: progress, size, strokeWidth, gradient, children

**MetricCard**
- Statistics display card
- Animated number counting
- Icon + label + value layout
- Glass or gradient background
- Props: label, value, icon, trend, animateValue

**FeatureGrid**
- Icon grid layout (cult.fit style)
- Auto-responsive columns
- Individual item animations
- Props: features[], columns, itemAnimation

**DynamicTabBar**
- Animated tab indicator
- Liquid morph animation between tabs
- Progress integration
- Validation state indicators
- Props: tabs[], activeIndex, progress, onTabPress

**GestureCard**
- Swipeable card component
- Spring physics for natural movement
- Configurable swipe actions
- Props: onSwipeLeft, onSwipeRight, threshold, springConfig

**AnimatedPressable**
- Enhanced Pressable wrapper
- Scale + spring animation on press
- Haptic feedback integration
- Props: onPress, scaleValue, hapticType, children

---

## Implementation Plan

### Phase 1: Foundation Setup

**Duration**: 3-4 hours

**1.1 Dependency Installation**
```bash
# Core UI Libraries
npm install @gluestack-ui/themed @gluestack-style/react
npm install nativewind tailwindcss

# Visual Effects
npm install @react-native-community/blur
npm install react-native-linear-gradient
npm install react-native-svg

# Animation & Gestures
npm install react-native-reanimated
npm install react-native-gesture-handler

# Optional Advanced Graphics
npm install react-native-skia

# Post-install
npx pod-install (iOS only)
```

**1.2 NativeWind Configuration**

Create/update `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gluestack-ui/themed/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E55A2B'
        },
        secondary: {
          DEFAULT: '#00D4FF',
          light: '#00FFFF',
          dark: '#00B8E6'
        },
        aurora: {
          'space-base': '#0A0F1C',
          'space-mid': '#1A1F2E',
          'space-high': '#252A3A',
          'purple-base': '#1C0A1F',
          'purple-mid': '#2E1A2F',
          'purple-high': '#3A252F'
        }
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'xxxl': '64px'
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'xxl': '24px'
      }
    }
  },
  plugins: []
}
```

Update `babel.config.js`:
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'nativewind/babel',
    'react-native-reanimated/plugin' // Must be last
  ]
}
```

**1.3 Create Design Token Files**

`src/theme/aurora-tokens.ts`:
- Export complete color system
- Export typography scale
- Export spacing constants
- Export shadow configurations
- Export animation timings

`src/theme/gradients.ts`:
- Define gradient presets
- Aurora background gradients
- Button gradients
- Card border gradients

`src/theme/animations.ts`:
- Animation duration constants
- Easing function definitions
- Spring configurations
- Common animation sequences

**1.4 Build Base Component Library**

Create in `src/components/ui/aurora/`:
- AuroraBackground.tsx
- GlassCard.tsx
- GlassView.tsx
- AnimatedPressable.tsx

Enhance existing components:
- Wrap Gluestack Button with gradient variants
- Extend Gluestack Card with glass variant
- Create Input with floating labels

**1.5 Configure Gluestack UI**

Setup Gluestack provider:
```typescript
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './gluestack-ui.config';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      {/* App content */}
    </GluestackUIProvider>
  );
}
```

Create custom config integrating Aurora theme tokens.

### Phase 2: Onboarding Redesign

**Duration**: 8-10 hours

**2.1 OnboardingContainer & Navigation System**

File: `src/screens/onboarding/OnboardingContainer.tsx`

Components to implement:
- AuroraBackground wrapper for entire onboarding
- Enhanced OnboardingTabBar with liquid animations
- Gradient progress bar (0-100%)
- Screen transition animations using Reanimated 3

Features:
- Shared element transitions between tabs
- Auto-save functionality (maintain existing)
- Guest mode support (maintain existing)
- Validation system integration (maintain existing)

Animation specifications:
- Tab switch: 300ms easeInOut with slide
- Progress bar: Smooth fill with spring animation
- Page transition: Slide (100px) + fade

**2.2 Tab 1: Personal Info**

File: `src/screens/onboarding/tabs/PersonalInfoTab.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── HeroSection
    │   ├── Display text: "Let's Get to Know You"
    │   └── Animated avatar placeholder
    ├── GlassCard (Personal Details)
    │   ├── Input (First Name) - floating label
    │   ├── Input (Last Name) - floating label
    │   ├── Input (Age) - numeric keyboard
    │   └── Select (Gender) - dropdown
    ├── GlassCard (Location)
    │   ├── Select (Country)
    │   ├── Select (State)
    │   └── Select (Region/City)
    ├── GlassCard (Daily Schedule)
    │   ├── TimePicker (Wake Time) - visual clock
    │   └── TimePicker (Sleep Time) - visual clock
    ├── FeatureGrid (Occupation Type)
    │   ├── Icon card: Desk Job
    │   ├── Icon card: Light Active
    │   ├── Icon card: Moderate Active
    │   ├── Icon card: Heavy Labor
    │   └── Icon card: Very Active
    └── Button (Next) - gradient, full-width
```

Micro-interactions:
- Input focus: Border glow + label float (200ms)
- Select open: Dropdown slide with blur background
- Time picker: Gesture-based clock rotation
- Occupation card tap: Scale 0.95 + spring back
- Next button: Pulse animation when all fields valid

**2.3 Tab 2: Diet Preferences**

File: `src/screens/onboarding/tabs/DietPreferencesTab.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── HeroCard (Food imagery with gradient overlay)
    │   └── Display text: "Your Nutrition Journey"
    ├── H2: "Diet Type"
    ├── HStack (Diet Type Cards - Large, Image-based)
    │   ├── GlassCard (Vegetarian) - food image background
    │   ├── GlassCard (Vegan) - food image background
    │   ├── GlassCard (Non-Vegetarian) - food image background
    │   └── GlassCard (Pescatarian) - food image background
    ├── GlassCard (Allergies & Restrictions)
    │   └── ChipSelector - animated chip selection
    ├── H2: "Diet Readiness"
    ├── VStack (Diet Readiness Progress Cards)
    │   ├── ProgressCard (Keto Ready) - icon + progress ring
    │   ├── ProgressCard (Intermittent Fasting) - icon + progress ring
    │   └── [... other diet types]
    ├── GlassCard (Meal Preferences)
    │   ├── ToggleCard (Breakfast) - food icon
    │   ├── ToggleCard (Lunch) - food icon
    │   ├── ToggleCard (Dinner) - food icon
    │   └── ToggleCard (Snacks) - food icon
    ├── GlassCard (Cooking Preferences)
    │   ├── Slider (Skill Level) - beginner to expert
    │   ├── Slider (Prep Time) - 15min to 2hrs
    │   └── Slider (Budget) - low to high
    └── Button (Next) - gradient, full-width
```

Micro-interactions:
- Diet type card selection: Elevation increase + gradient border glow
- Chip selection: Scale + color transition
- Toggle activation: Slide + color fill animation
- Slider adjustment: Haptic feedback at intervals
- Progress ring: Animated fill when entering viewport

**2.4 Tab 3: Body Analysis**

File: `src/screens/onboarding/tabs/BodyAnalysisTab.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── HeroSection (Body silhouette with measurement points)
    │   └── SVG illustration with animated measurement indicators
    ├── GlassCard (Current Metrics)
    │   ├── MetricInput (Height) - visual height scale
    │   ├── MetricInput (Current Weight) - visual weight scale
    │   └── MetricInput (Target Weight) - visual weight scale
    ├── GlassCard (Goal Visualization)
    │   ├── H3: "Your Transformation Goal"
    │   ├── AnimatedChart (Current → Target visualization)
    │   └── TimelineSlider (4-104 weeks)
    ├── GlassCard (Body Measurements)
    │   ├── Input (Body Fat %)
    │   ├── Input (Waist)
    │   ├── Input (Hip)
    │   └── Input (Chest)
    ├── GlassCard (Progress Photos)
    │   ├── PhotoUploadCard (Front) - glass card with AI badge
    │   ├── PhotoUploadCard (Side) - glass card with AI badge
    │   └── PhotoUploadCard (Back) - glass card with AI badge
    ├── GlassCard (Medical Information)
    │   ├── ChipSelector (Medical Conditions)
    │   ├── Input (Medications)
    │   └── Input (Physical Limitations)
    ├── GlassCard (Additional Factors)
    │   ├── Toggle (Pregnancy Status)
    │   ├── Toggle (Breastfeeding)
    │   └── Slider (Stress Level) - 1-10 scale
    └── Button (Next) - gradient, full-width
```

Micro-interactions:
- Measurement point hover: Pulse animation on body diagram
- Chart animation: Line drawing from current to target
- Timeline slider: Milestone indicators with haptic feedback
- Photo upload: Blur-up preview + success checkmark animation
- Metric input: Number change animation when typing

**2.5 Tab 4: Workout Preferences**

File: `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── HeroCard (Workout imagery with overlay)
    │   └── Display text: "Design Your Perfect Workout"
    ├── H2: "Preferred Location"
    ├── HStack (Location Cards)
    │   ├── ImageCard (Home) - home gym imagery
    │   ├── ImageCard (Gym) - gym imagery
    │   └── ImageCard (Both) - combined imagery
    ├── GlassCard (Equipment Availability)
    │   └── FeatureGrid (Equipment Icons)
    │       ├── Dumbbells, Barbell, Resistance Bands, etc.
    ├── GlassCard (Workout Timing)
    │   ├── Select (Time Preference) - Morning/Afternoon/Evening
    │   └── Select (Session Duration) - 15min/30min/45min/60min
    ├── GlassCard (Intensity Level)
    │   ├── H3: "Fitness Level"
    │   └── SegmentedControl (Beginner/Intermediate/Advanced)
    ├── GlassCard (Workout Types)
    │   └── SwipeableCardStack
    │       ├── Strength Training
    │       ├── Cardio
    │       ├── HIIT
    │       ├── Yoga/Flexibility
    │       └── Sports/Functional
    ├── GlassCard (Fitness Goals)
    │   └── MultiSelect
    │       ├── Weight Loss
    │       ├── Muscle Gain
    │       ├── Endurance
    │       ├── Flexibility
    │       └── General Fitness
    ├── GlassCard (Fitness Assessment)
    │   ├── Slider (Experience Years) - 0-20+
    │   ├── Slider (Weekly Frequency) - 0-7 days
    │   ├── Input (Pushups Max)
    │   ├── Input (Running Distance)
    │   └── Slider (Flexibility) - 1-10
    └── Button (Next) - gradient, full-width
```

Micro-interactions:
- Location card: Image zoom on hover/press
- Equipment icon: Bounce animation on selection
- Segmented control: Sliding indicator with spring
- Swipeable cards: Gesture-based swipe with spring physics
- Multi-select: Checkmark animation + card highlight
- Slider: Value display tooltip following thumb

**2.6 Tab 5: Advanced Review**

File: `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── HeroSection
    │   ├── Success animation (checkmark burst)
    │   └── Display text: "Your Personalized Plan"
    ├── H2: "Body Composition Analysis"
    ├── Grid (2 columns)
    │   ├── MetricCard (BMI)
    │   │   ├── ProgressRing (animated)
    │   │   ├── Animated number counter
    │   │   └── Status label
    │   ├── MetricCard (BMR)
    │   ├── MetricCard (TDEE)
    │   └── MetricCard (Target Calories)
    ├── GlassCard (Nutritional Breakdown)
    │   ├── H3: "Daily Nutritional Needs"
    │   ├── GradientBarChart (Macros)
    │   │   ├── Protein bar
    │   │   ├── Carbs bar
    │   │   └── Fats bar
    │   └── Caption: Gram amounts
    ├── GlassCard (Weight Management Plan)
    │   ├── LineChart (Projected weight over time)
    │   └── Milestone markers
    ├── GlassCard (Fitness Metrics)
    │   ├── MetricRow (VO2 Max Estimate)
    │   ├── MetricRow (Max Heart Rate)
    │   ├── MetricRow (Target Heart Rate Zones)
    │   └── ColorCodedZones (Zone 1-5)
    ├── H2: "Health Scores"
    ├── LargeProgressRing (Overall Health Score 0-100)
    │   ├── Gradient stroke
    │   ├── Glow effect
    │   └── Animated counter
    ├── Grid (Sub-scores)
    │   ├── ScoreCard (Nutrition Score)
    │   ├── ScoreCard (Fitness Score)
    │   ├── ScoreCard (Sleep Score)
    │   └── ScoreCard (Recovery Score)
    ├── GlassCard (Sleep Analysis)
    │   ├── CircularClock (Sleep schedule visualization)
    │   └── Sleep duration + quality metrics
    ├── GlassCard (Validation Summary)
    │   ├── Success items (checkmark + green text)
    │   ├── Warning items (alert icon + yellow text)
    │   └── Info items (info icon + blue text)
    └── Button (Start Your Journey)
        ├── Large size
        ├── Gradient background
        └── Pulse animation
```

Micro-interactions:
- Success animation: Burst particle effect on mount
- Number counters: Count-up animation (0 to value) with easing
- Progress rings: Circular fill animation with spring
- Chart drawing: Animated line/bar drawing on mount
- Score cards: Stagger entrance animation (cascade)
- Start button: Continuous subtle pulse + scale on press

### Phase 3: Main App Screens Redesign

**Duration**: 12-15 hours

**3.1 Home Screen**

File: `src/screens/main/HomeScreen.tsx`

Layout structure:
```
AuroraBackground (Dynamic gradient variant)
└── ScrollView
    ├── Header (Fixed/Sticky)
    │   ├── HStack
    │   │   ├── Avatar (User photo)
    │   │   ├── VStack (Greeting)
    │   │   │   ├── Caption: "Good Morning"
    │   │   │   └── H3: User's first name
    │   │   └── Spacer
    │   ├── HStack (Right actions)
    │   │   ├── Badge (Streak counter)
    │   │   │   ├── Fire icon
    │   │   │   └── Number (animated)
    │   │   └── IconButton (Notifications)
    │       └── Badge (Unread count)
    ├── HeroCard (Daily Motivation)
    │   ├── Background: Inspirational imagery
    │   ├── Gradient overlay
    │   └── Quote text (rotates daily)
    ├── H2: "Today's Focus"
    ├── GlassCard (Today's Workout)
    │   ├── HStack
    │   │   ├── Thumbnail (Workout preview)
    │   │   └── VStack
    │   │       ├── H3: Workout name
    │   │       ├── Caption: Duration + difficulty
    │   │       └── ProgressBar (Completion %)
    │   └── Button (START) - gradient, prominent
    ├── GlassCard (Meal Plan)
    │   ├── HStack (Scrollable)
    │   │   ├── MealCard (Breakfast) - food image
    │   │   ├── MealCard (Lunch) - food image
    │   │   ├── MealCard (Dinner) - food image
    │   │   └── MealCard (Snacks) - food image
    │   └── Caption: "Tap to view details"
    ├── GlassCard (Quick Stats)
    │   ├── Grid (3 columns)
    │   │   ├── QuickStat (Calories)
    │   │   │   ├── ProgressRing (mini)
    │   │   │   ├── Number
    │   │   │   └── Label
    │   │   ├── QuickStat (Steps)
    │   │   └── QuickStat (Water)
    ├── H2: "Recent Activity"
    ├── VStack (Activity Feed)
    │   ├── ActivityCard (Yesterday's workout)
    │   │   ├── Icon + activity type
    │   │   ├── Duration + calories
    │   │   └── Timestamp
    │   ├── ActivityCard (Previous meal logged)
    │   └── ActivityCard (Achievement unlocked)
    └── GlassCard (Personal Training CTA)
        ├── Icon grid preview
        ├── H3: "Book Personal Training"
        ├── Caption: "50 mins | Goal-based | Expert trainers"
        └── Button (BOOK NOW) - gradient
```

Micro-interactions:
- Streak counter: Number flip animation on update
- Hero card: Parallax scroll effect on background
- Workout card: Lift elevation on press
- Meal cards: Horizontal scroll with snap
- Quick stats: Ring fill animation on mount
- Activity feed: Stagger entrance (cascade from top)
- Pull to refresh: Custom Aurora loading animation

**3.2 Workout Screen**

File: `src/screens/main/WorkoutScreen.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── Header
    │   ├── H1: "Your Smart Workout Plan"
    │   └── Caption: Week indicator
    ├── HeroCard (Workout Plan Preview)
    │   ├── PhoneMockup (SVG illustration)
    │   │   └── Mini screenshot of workout interface
    │   ├── Gradient overlay
    │   └── Text: "AI-Optimized for Your Goals"
    ├── GlassCard (Feature Grid - Cult.fit style)
    │   ├── Grid (2x2)
    │   │   ├── Feature (50 mins dedicated sessions)
    │   │   │   ├── Icon (Clock)
    │   │   │   └── Text
    │   │   ├── Feature (Goal-based workouts)
    │   │   │   ├── Icon (Target)
    │   │   │   └── Text
    │   │   ├── Feature (Faster & better results)
    │   │   │   ├── Icon (Lightning)
    │   │   │   └── Text
    │   │   └── Feature (Reduced risk of injury)
    │   │       ├── Icon (Shield)
    │   │       └── Text
    ├── ExpandableCard (Today's Workout)
    │   ├── Header (Collapsed state)
    │   │   ├── H3: Workout name
    │   │   ├── Caption: Duration + difficulty
    │   │   └── ChevronIcon (Animated rotation)
    │   └── Content (Expanded state)
    │       ├── VStack (Exercise List)
    │       │   ├── ExerciseRow
    │       │   │   ├── Thumbnail (Exercise demo)
    │       │   │   ├── VStack
    │       │   │   │   ├── Body: Exercise name
    │       │   │   │   └── Caption: Sets x Reps
    │       │   │   └── IconButton (Info) - shows video
    │       │   └── [...more exercises]
    │       └── Button (START WORKOUT) - gradient, large
    ├── H2: "Workout History"
    ├── VStack (History Cards)
    │   ├── GestureCard (Swipeable)
    │   │   ├── Front face
    │   │   │   ├── Date + workout name
    │   │   │   ├── Duration + calories
    │   │   │   └── Completion status
    │   │   └── Swipe actions
    │   │       ├── Left: Delete (red)
    │   │       └── Right: Repeat (green)
    │   └── [...more history items]
    ├── H2: "Suggested Workouts"
    ├── HStack (Horizontal scroll)
    │   ├── WorkoutCard (HIIT Cardio)
    │   ├── WorkoutCard (Strength)
    │   └── WorkoutCard (Yoga)
    └── Spacer
```

Micro-interactions:
- Phone mockup: Subtle floating animation (3D effect)
- Feature grid icons: Scale pulse on mount (staggered)
- Expandable card: Smooth height animation with spring
- Exercise row tap: Navigate with shared element transition
- Swipe-to-action: Spring physics with haptic feedback
- START button: Pulse animation + scale on press
- History cards: Entrance animation from bottom

**3.3 Analytics Screen**

File: `src/screens/main/AnalyticsScreen.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── Header
    │   ├── H1: "Progress Analytics"
    │   └── SegmentedControl (Week/Month/Year)
    ├── Grid (2x2 - Metric Summary Cards)
    │   ├── MetricCard (Weight Progress)
    │   │   ├── MiniLineChart (Sparkline)
    │   │   ├── Current value (large)
    │   │   ├── Trend indicator (up/down arrow)
    │   │   └── Change amount
    │   ├── MetricCard (Calories Burned)
    │   │   └── MiniAreaChart
    │   ├── MetricCard (Workouts Completed)
    │   │   └── MiniBarChart
    │   └── MetricCard (Active Streak)
    │       └── CircularProgress (mini)
    ├── GlassCard (Weight Trend - Detailed)
    │   ├── H3: "Weight Progress"
    │   ├── InteractiveLineChart
    │   │   ├── X-axis: Time period
    │   │   ├── Y-axis: Weight values
    │   │   ├── Line: Current weight
    │   │   ├── Line (dashed): Target projection
    │   │   └── Touch interaction: Show value tooltip
    │   └── Legend
    ├── GlassCard (Calorie Breakdown)
    │   ├── H3: "Calorie Analysis"
    │   ├── AreaChart (Stacked)
    │   │   ├── Calories consumed
    │   │   └── Calories burned
    │   └── Average line
    ├── GlassCard (Workout Frequency)
    │   ├── H3: "Workout Consistency"
    │   ├── BarChart (Weekly frequency)
    │   └── Comparison to previous period
    ├── GlassCard (Body Measurements)
    │   ├── H3: "Body Composition Trend"
    │   ├── MultiLineChart
    │   │   ├── Body fat %
    │   │   ├── Muscle mass estimate
    │   │   └── BMI
    │   └── Legend with color coding
    ├── H2: "Achievements"
    ├── HStack (Horizontal scroll)
    │   ├── AchievementBadge (7-Day Streak)
    │   ├── AchievementBadge (First 5K)
    │   ├── AchievementBadge (Weight Milestone)
    │   └── [...more badges]
    └── Button (Export Progress) - outline variant
```

Micro-interactions:
- Segmented control: Sliding indicator with data refresh animation
- Metric cards: Number count-up on period change
- Charts: Draw animation when entering viewport
- Chart interaction: Touch to reveal tooltip with haptic
- Trend indicators: Animated arrow with color transition
- Achievement badges: Pop-in animation on scroll
- Export button: Download icon animation on press

**3.4 Diet/Nutrition Screen**

File: `src/screens/main/DietScreen.tsx`

Layout structure:
```
AuroraBackground
└── ScrollView
    ├── Header
    │   ├── H1: "Nutrition Plan"
    │   └── DateSelector (Today + navigation)
    ├── GlassCard (Calorie Overview)
    │   ├── Center
    │   │   └── LargeProgressRing
    │   │       ├── Gradient stroke (calories consumed)
    │   │       ├── Inner ring (protein, carbs, fats - stacked)
    │   │       └── Center content
    │   │           ├── Large number: Calories remaining
    │   │           ├── Caption: "Calories left"
    │   │           └── Micro: Target amount
    │   └── Grid (3 columns - Macro breakdown)
    │       ├── MacroStat (Protein)
    │       ├── MacroStat (Carbs)
    │       └── MacroStat (Fats)
    ├── H2: "Today's Meals"
    ├── VStack (Meal Timeline)
    │   ├── MealCard (Breakfast)
    │   │   ├── Time badge
    │   │   ├── HStack
    │   │   │   ├── Food image (rounded, gradient border)
    │   │   │   └── VStack
    │   │   │       ├── H3: Meal name
    │   │   │       ├── Caption: Calorie count
    │   │   │       └── HStack (Macro badges)
    │   │   │           ├── Badge (P: Xg)
    │   │   │           ├── Badge (C: Xg)
    │   │   │           └── Badge (F: Xg)
    │   │   └── IconButton (Edit/Delete)
    │   ├── MealCard (Lunch) - same structure
    │   ├── MealCard (Dinner) - same structure
    │   └── MealCard (Snacks) - same structure
    ├── H2: "Meal Suggestions"
    ├── HStack (Swipeable card stack)
    │   ├── SuggestionCard
    │   │   ├── HeroImage (Food photo)
    │   │   ├── Gradient overlay
    │   │   ├── VStack
    │   │   │   ├── H3: Recipe name
    │   │   │   ├── Caption: Cook time + difficulty
    │   │   │   ├── HStack (Macro preview)
    │   │   │   └── Button (Add to Plan)
    │   │   └── Swipe gestures
    │   │       ├── Right: Add to meals
    │   │       └── Left: See next suggestion
    │   └── [...more suggestions]
    ├── GlassCard (Nutrition Breakdown Chart)
    │   ├── H3: "Weekly Nutrition Trends"
    │   ├── BarChart (Grouped)
    │   │   └── Daily macro intake
    │   └── Average line overlays
    ├── GlassCard (Water Intake)
    │   ├── HStack
    │   │   ├── AnimatedWaterGlass (SVG)
    │   │   │   └── Fill animation based on intake
    │   │   └── VStack
    │   │       ├── H2: Amount consumed
    │   │       ├── Caption: Target amount
    │   │       └── HStack (Quick add buttons)
    │   │           ├── +250ml
    │   │           ├── +500ml
    │   │           └── +1L
    │   └── Timeline (Intake history)
    └── FAB (Floating Action Button)
        ├── Position: Bottom-right
        ├── Icon: Plus
        ├── Action: Open meal logging bottom sheet
        └── Gradient background + shadow
```

Micro-interactions:
- Calorie ring: Animated fill with multi-color segments
- Macro stats: Update with count-up animation
- Meal cards: Slide in from left (stagger on mount)
- Edit/Delete: Swipe actions with haptic
- Suggestion cards: Gesture-based swipe with spring physics
- Add to plan: Card flip animation + success feedback
- Water glass: Liquid fill animation (wave effect)
- Quick add buttons: Ripple effect + water fill update
- FAB: Scale pulse + rotation on press

**3.5 Profile Screen**

File: `src/screens/main/ProfileScreen.tsx`

Layout structure:
```
AuroraBackground (Cosmic Purple variant)
└── ScrollView
    ├── HeroSection (Gradient background)
    │   ├── VStack (Center aligned)
    │   │   ├── Avatar (Large - 120px)
    │   │   │   └── EditButton (overlay)
    │   │   ├── H2: User full name
    │   │   └── Caption: Member since date
    │   └── StreakBadge (Floating badge)
    │       ├── Fire icon (animated)
    │       ├── Number (current streak)
    │       └── Label: "Day Streak"
    ├── Grid (2x2 - Quick Stats)
    │   ├── StatCard (Total Workouts)
    │   │   ├── Icon
    │   │   ├── Large number
    │   │   └── Label
    │   ├── StatCard (Weight Lost/Gained)
    │   ├── StatCard (Streak Days)
    │   └── StatCard (Achievements)
    ├── H2: "Account"
    ├── GlassCard
    │   ├── SettingRow (Personal Information)
    │   │   ├── Icon
    │   │   ├── Label
    │   │   └── ChevronRight
    │   ├── Divider
    │   ├── SettingRow (Goals & Preferences)
    │   ├── Divider
    │   └── SettingRow (Body Measurements)
    ├── H2: "Preferences"
    ├── GlassCard
    │   ├── SettingRow (Notifications)
    │   │   ├── Icon
    │   │   ├── Label
    │   │   └── Switch (inline)
    │   ├── Divider
    │   ├── SettingRow (Theme Preference)
    │   │   └── SegmentedControl (Aurora variants)
    │   ├── Divider
    │   ├── SettingRow (Units)
    │   │   └── Select (Metric/Imperial)
    │   ├── Divider
    │   └── SettingRow (Language)
    ├── H2: "App"
    ├── GlassCard
    │   ├── SettingRow (Privacy & Security)
    │   ├── Divider
    │   ├── SettingRow (Help & Support)
    │   ├── Divider
    │   ├── SettingRow (About)
    │   ├── Divider
    │   └── SettingRow (Terms & Privacy Policy)
    ├── H2: "Data"
    ├── GlassCard
    │   ├── SettingRow (Export Data)
    │   ├── Divider
    │   ├── SettingRow (Sync Settings)
    │   ├── Divider
    │   └── SettingRow (Clear Cache)
    └── Button (Logout)
        ├── Variant: Ghost
        ├── Color: Error
        └── Margin top: xl
```

Micro-interactions:
- Avatar tap: Scale animation + edit modal slide-up
- Streak badge: Flame flicker animation (continuous)
- Stat cards: Count-up animation on mount
- Setting rows: Background highlight on press
- Switch toggle: Smooth slide with haptic
- Theme selector: Aurora background preview in real-time
- Chevron: Rotate on press + row slide animation
- Logout: Confirmation dialog with blur background

### Phase 4: Micro-Interactions & Polish

**Duration**: 4-6 hours

**4.1 Global Animation Library**

File: `src/animations/interactions.ts`

Implement standardized animations:

**Button Interactions**
```typescript
// Press animation
const buttonPress = {
  scale: 0.95,
  duration: 100,
  easing: Easing.out(Easing.ease)
}

// Release with spring
const buttonRelease = {
  scale: 1.0,
  spring: {
    damping: 15,
    stiffness: 100
  }
}
```

**Card Interactions**
```typescript
// Elevation lift on press
const cardLift = {
  translateY: -4,
  shadowOpacity: 0.3,
  duration: 200,
  easing: Easing.out(Easing.ease)
}

// Return to rest
const cardRest = {
  translateY: 0,
  shadowOpacity: 0.2,
  spring: {
    damping: 12,
    stiffness: 80
  }
}
```

**Input Interactions**
```typescript
// Focus animation
const inputFocus = {
  borderColor: 'primary',
  borderWidth: 2,
  shadowOpacity: 0.25,
  duration: 200
}

// Label float
const labelFloat = {
  translateY: -24,
  scale: 0.85,
  color: 'primary',
  duration: 200,
  easing: Easing.out(Easing.ease)
}
```

**Page Transitions**
```typescript
// Enter from right
const slideInRight = {
  from: { translateX: width },
  to: { translateX: 0 },
  duration: 300,
  easing: Easing.out(Easing.ease)
}

// Fade transition
const fadeTransition = {
  from: { opacity: 0 },
  to: { opacity: 1 },
  duration: 200
}
```

**Number Counter Animation**
```typescript
// Count up effect
const countUp = (from: number, to: number, duration: number) => {
  // Reanimated worklet
  // Easing curve for natural counting
  // Round to appropriate decimal places
}
```

**Progress Animations**
```typescript
// Linear progress fill
const progressFill = {
  from: { width: '0%' },
  to: { width: `${percentage}%` },
  duration: 800,
  easing: Easing.out(Easing.cubic)
}

// Circular progress stroke
const circularFill = {
  from: { strokeDashoffset: circumference },
  to: { strokeDashoffset: circumference * (1 - percentage / 100) },
  duration: 1000,
  easing: Easing.out(Easing.cubic)
}
```

**Tab Switch Animation**
```typescript
// Liquid morph indicator
const tabIndicatorMorph = {
  translateX: targetPosition,
  width: targetWidth,
  spring: {
    damping: 20,
    stiffness: 120
  }
}
```

**Success State Animation**
```typescript
// Checkmark draw
const checkmarkDraw = {
  strokeDashoffset: 0,
  duration: 400,
  easing: Easing.out(Easing.ease)
}

// Celebration burst
const celebrationBurst = {
  // Particle explosion
  // Scale from 0 to 1 with overshoot
  // Fade out
}
```

**4.2 Gesture Implementation**

File: `src/gestures/handlers.ts`

**Swipe to Delete**
```typescript
// Horizontal pan gesture
// Threshold: 50% of card width
// Snap points: 0 (rest), -width (delete)
// Spring animation to snap points
// Delete confirmation on complete swipe
```

**Pull to Refresh**
```typescript
// Vertical pan gesture (only when scrolled to top)
// Threshold: 80px
// Aurora spinner appears during pull
// Animated gradient rotation
// Release triggers refresh callback
// Snap back animation on completion
```

**Pinch to Zoom (Photo Upload)**
```typescript
// Pinch gesture on image
// Scale range: 1.0 to 3.0
// Simultaneous pan gesture for positioning
// Smooth interpolation
// Haptic at 1.0x (reset) and 3.0x (max)
```

**Drag to Reorder (Meal Planning)**
```typescript
// Long press activates drag mode
// Elevation increases during drag
// Other items shift to make space
// Snap to grid positions
// Drop animation with spring
```

**Long Press Context Menu**
```typescript
// Long press threshold: 500ms
// Haptic feedback on activation
// Blur background appears
// Menu slides up with spring
// Options with icons
// Tap outside to dismiss
```

**4.3 Loading States**

**Skeleton Screens**
```typescript
// Component-level skeletons
// Shimmer animation: left to right gradient sweep
// Duration: 1500ms infinite loop
// Preserve layout dimensions
// Fade transition to real content
```

**Aurora Spinner**
```typescript
// Custom spinner component
// Rotating gradient ring
// Size variants: sm, md, lg
// Color scheme matches active Aurora theme
// 360-degree rotation: 1200ms infinite
```

**Progressive Image Loading**
```typescript
// Blur-up technique
// Load tiny thumbnail (blur 20px)
// Fade in full-resolution image
// Transition duration: 400ms
// Maintain aspect ratio during load
```

**4.4 Haptic Feedback System**

File: `src/utils/haptics.ts`

Haptic feedback mapping:
```typescript
// Selection: Light impact
- Chip selection
- Toggle switch
- Radio/checkbox selection

// Success: Notification success
- Form submission
- Workout completion
- Achievement unlocked

// Warning: Notification warning
- Validation errors
- Threshold reached

// Error: Notification error
- Action failed
- Invalid input

// Impact: Medium impact
- Button press (primary actions)
- Card selection

// Heavy Impact: Heavy impact
- Pull to refresh complete
- Delete action
```

**4.5 Accessibility Enhancements**

**Screen Reader Support**
```typescript
// accessibilityLabel on all interactive elements
// accessibilityHint for complex interactions
// accessibilityRole for semantic meaning
// accessibilityState for dynamic states
```

**Color Contrast**
```typescript
// WCAG AAA compliance (7:1 ratio)
// Test all text on glass surfaces
// Ensure button text meets standards
// Status colors have sufficient contrast
```

**Touch Target Sizes**
```typescript
// Minimum: 44x44 points (iOS) / 48x48dp (Android)
// Buttons: Ensure adequate padding
// Interactive icons: Use hitSlop if needed
// Form inputs: Full-width tap areas
```

**Reduce Motion Support**
```typescript
// Detect user preference
import { AccessibilityInfo } from 'react-native';

// Disable decorative animations
// Keep functional transitions simple
// Instant state changes instead of animations
```

---

## File Structure Changes

### New Files to Create

**Theme & Design System**
```
src/theme/
├── aurora-tokens.ts           # Complete design tokens
├── gradients.ts               # Gradient presets
├── animations.ts              # Animation constants
└── gluestack-ui.config.ts     # Gluestack configuration

src/components/ui/aurora/
├── AuroraBackground.tsx       # Animated gradient container
├── GlassCard.tsx             # Glassmorphic card
├── GlassView.tsx             # Glass effect wrapper
├── HeroSection.tsx           # Hero with image overlay
├── AnimatedIcon.tsx          # Icon with micro-interactions
├── ProgressRing.tsx          # Circular progress
├── MetricCard.tsx            # Stats display card
├── FeatureGrid.tsx           # Icon grid layout
├── DynamicTabBar.tsx         # Animated tab bar
├── GestureCard.tsx           # Swipeable card
├── AnimatedPressable.tsx     # Enhanced Pressable
└── index.ts                  # Barrel export

src/animations/
├── interactions.ts           # Standardized animations
└── shared-elements.ts        # Shared element transitions

src/gestures/
├── handlers.ts              # Gesture implementations
└── types.ts                # Gesture type definitions

src/utils/
├── haptics.ts              # Haptic feedback utilities
└── accessibility.ts        # Accessibility helpers
```

**Enhanced Gluestack Components**
```
src/components/ui/gluestack/
├── Button.tsx              # Enhanced with gradients
├── Card.tsx                # Glass variant added
├── Input.tsx               # Floating labels
├── Select.tsx              # Custom dropdown styling
└── index.ts               # Barrel export
```

### Files to Modify

**Onboarding**
```
src/screens/onboarding/
├── OnboardingContainer.tsx                   # Add Aurora background
├── tabs/PersonalInfoTab.tsx                  # Complete redesign
├── tabs/DietPreferencesTab.tsx              # Complete redesign
├── tabs/BodyAnalysisTab.tsx                 # Complete redesign
├── tabs/WorkoutPreferencesTab.tsx           # Complete redesign
└── tabs/AdvancedReviewTab.tsx               # Complete redesign

src/components/onboarding/
└── OnboardingTabBar.tsx                      # Liquid animations
```

**Main App Screens**
```
src/screens/main/
├── HomeScreen.tsx                            # Complete redesign
├── WorkoutScreen.tsx                         # Complete redesign
├── AnalyticsScreen.tsx                       # Complete redesign
├── DietScreen.tsx                            # Complete redesign
└── ProfileScreen.tsx                         # Complete redesign
```

**Configuration**
```
tailwind.config.js                            # Complete Tailwind setup
babel.config.js                               # Add Reanimated plugin
tsconfig.json                                 # Path aliases (if needed)
package.json                                  # New dependencies
```

---

## Quality Assurance Checklist

### Performance Standards

- [ ] All animations run at 60fps minimum on mid-range devices
- [ ] High-end devices achieve 120fps for micro-interactions
- [ ] Page transitions complete within 300ms
- [ ] User actions receive feedback within 100ms
- [ ] Image loading with progressive enhancement
- [ ] Glassmorphism optimized with dynamic blur reduction on older devices
- [ ] No frame drops during gesture interactions
- [ ] Smooth scrolling with large lists (FlatList optimization)

### Visual Quality

- [ ] Aurora backgrounds animate smoothly without stuttering
- [ ] Glass effect maintains consistent blur across all cards
- [ ] Gradients render correctly on all screen densities
- [ ] Shadows appear correctly on both iOS and Android
- [ ] Typography scales appropriately for all screen sizes
- [ ] Color contrast meets WCAG AAA standards (7:1 ratio)
- [ ] Icons render sharply at all sizes
- [ ] Images maintain aspect ratios during loading

### Interaction Quality

- [ ] All buttons provide immediate visual feedback
- [ ] Haptic feedback fires at appropriate moments
- [ ] Gesture thresholds feel natural and responsive
- [ ] Form inputs show validation states clearly
- [ ] Error messages appear in appropriate locations
- [ ] Success states celebrate user achievements
- [ ] Loading states prevent user confusion
- [ ] Navigation transitions maintain context

### Accessibility

- [ ] All interactive elements have accessibility labels
- [ ] Touch targets meet minimum size requirements (44x44 / 48x48)
- [ ] Color is not the only means of conveying information
- [ ] Reduce motion preference respected
- [ ] Screen reader navigation is logical
- [ ] Form inputs have proper labels and hints
- [ ] Error messages are announced to screen readers
- [ ] Focus management works correctly

### Cross-Platform Consistency

- [ ] UI appears identical on iOS and Android (within platform constraints)
- [ ] Animations perform equally well on both platforms
- [ ] Glassmorphism works on Android (fallback if needed)
- [ ] Gradients render consistently
- [ ] Haptics work on both platforms
- [ ] Fonts render correctly
- [ ] Safe area insets handled properly

### Responsive Design

- [ ] Layouts adapt to different screen sizes
- [ ] Grids reflow appropriately
- [ ] Typography scales with screen size
- [ ] Spacing adjusts for content density
- [ ] Landscape orientation supported where appropriate
- [ ] Tablet layouts optimized (if applicable)
- [ ] Foldable device support (if applicable)

---

## Implementation Timeline Estimate

### Phase 1: Foundation Setup (3-4 hours)
- Install dependencies: 30 minutes
- Configure NativeWind: 1 hour
- Create design tokens: 1 hour
- Build base Aurora components: 1.5 hours

### Phase 2: Onboarding Redesign (8-10 hours)
- Container & navigation: 1.5 hours
- Personal Info tab: 1.5 hours
- Diet Preferences tab: 1.5 hours
- Body Analysis tab: 2 hours
- Workout Preferences tab: 1.5 hours
- Review tab: 2 hours

### Phase 3: Main App Screens (12-15 hours)
- Home screen: 3 hours
- Workout screen: 3 hours
- Analytics screen: 3 hours
- Diet/Nutrition screen: 3 hours
- Profile screen: 2 hours

### Phase 4: Polish & Micro-interactions (4-6 hours)
- Animation library: 1.5 hours
- Gesture handlers: 1.5 hours
- Loading states: 1 hour
- Haptics & accessibility: 1 hour
- Testing & refinement: 1 hour

**Total Estimated Time**: 27-35 hours

**Recommended Approach**: Incremental implementation with testing after each phase

---

## Success Metrics

This redesign will achieve:

1. **Visual Excellence**
   - Aurora design language with dynamic backgrounds
   - Glassmorphism throughout the interface
   - Immersive media with gradient overlays
   - Bold, confident typography

2. **Performance Leadership**
   - 60-120fps animations across all interactions
   - Sub-300ms page transitions
   - Zero perceptible lag in gestures
   - Optimized for all device tiers

3. **Component Quality**
   - Industry-leading UI library (Gluestack UI)
   - Comprehensive custom component set
   - Reusable, maintainable code architecture
   - TypeScript strict mode compliance

4. **User Experience**
   - Intuitive micro-interactions everywhere
   - Haptic feedback enhancing tactile experience
   - Smooth, natural animations
   - Accessibility for all users

5. **Competitive Positioning**
   - Matches or exceeds cult.fit design quality
   - Superior to Nike Training Club interface
   - More engaging than Peloton mobile app
   - Best-in-class fitness app UI

---

## References & Research Sources

### Design Systems
- Cult.fit Aurora Design Language: https://blog.cult.fit/posts/aurora-design
- Cult.fit Design Portal: https://design.cult.fit/

### Component Libraries
- Gluestack UI Documentation: https://gluestack.io/
- NativeWind Documentation: https://www.nativewind.dev/
- Tamagui Documentation: https://tamagui.dev/

### Animation Resources
- React Native Reanimated 3: https://docs.swmansion.com/react-native-reanimated/
- React Native Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/

### Design Trends Research
- 2025 Mobile Design Trends: Multiple industry sources
- Glassmorphism Implementation Guides
- Micro-interaction Best Practices

### Competitive Analysis
- Nike Training Club UI Patterns
- Peloton Mobile Experience
- MyFitnessPal Interface Design
- Industry-leading fitness apps

---

## Technical Dependencies

### Required Packages

```json
{
  "dependencies": {
    "@gluestack-ui/themed": "latest",
    "@gluestack-style/react": "latest",
    "@react-native-community/blur": "latest",
    "react-native-linear-gradient": "latest",
    "react-native-svg": "latest",
    "react-native-reanimated": "^3.x.x",
    "react-native-gesture-handler": "latest",
    "nativewind": "^4.1.23",
    "tailwindcss": "^3.4.17"
  },
  "devDependencies": {
    "@types/react-native-vector-icons": "latest"
  }
}
```

### Optional Advanced Packages
```json
{
  "dependencies": {
    "react-native-skia": "latest"
  }
}
```

### Already Installed (Verify Versions)
- Expo SDK 53
- React Native 0.79
- TypeScript (strict mode)
- Zustand (state management)
- Supabase client

---

## Notes for New Chat Session

**Context to Remember**:
1. This is a complete UI/UX redesign, not an incremental update
2. Target is world-class design exceeding cult.fit, Nike NTC, Peloton
3. No emojis in production code (professional visual presentation only)
4. Aurora design language is the core inspiration
5. Glassmorphism is a critical visual element
6. 60-120fps animations are non-negotiable
7. Gluestack UI is the chosen component library
8. NativeWind for styling (already installed, needs configuration)
9. Both onboarding AND main app screens are in scope
10. Existing functionality must be preserved (auth, validation, auto-save, etc.)

**Current Project State**:
- Onboarding: 5-tab structure with comprehensive data collection
- Main app: 5 core screens (Home, Workout, Analytics, Diet, Profile)
- Tech stack: Expo 53, React Native 0.79, TypeScript strict
- Styling: Custom StyleSheet (to be replaced/enhanced)
- State: Zustand stores
- Backend: Supabase integration

**Implementation Priority**:
1. Start with Phase 1 (Foundation) - cannot proceed without this
2. Move to Phase 2 (Onboarding) - most critical user-facing flow
3. Then Phase 3 (Main screens) - core app experience
4. Finish with Phase 4 (Polish) - elevates to world-class

**Key Decisions Made**:
- Gluestack UI over Tamagui (Tailwind integration)
- NativeWind fully configured (not just installed)
- Reanimated 3 for all animations (performance critical)
- @react-native-community/blur for glassmorphism
- No react-native-skia initially (optional later)
- Professional presentation only (no emojis/childish elements)

---

## End of Design Documentation

Last Updated: 2025-01-13
Version: 1.0.0
Status: Ready for Implementation