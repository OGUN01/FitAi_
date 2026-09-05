// Mirrors the LIVE Postgres CHECK constraint `check_timeline_range` on
// `body_analysis.target_timeline_weeks` (confirmed via the Supabase
// Management API: `CHECK ((target_timeline_weeks >= 4) AND
// (target_timeline_weeks <= 104))` — undocumented in any migration file,
// a live-schema-drift pattern already seen elsewhere in this project).
// ANY code that computes a new target_timeline_weeks value MUST clamp to
// this exact range before persisting it, or the Supabase insert/update
// throws a raw 23514 error. Shared here (not left duplicated per call
// site) specifically because a previous drift — one call site clamping
// correctly, a sibling call site not clamping at all — is exactly what
// caused a real, intermittent (~2-of-5 fresh accounts) onboarding bug.
export const TARGET_TIMELINE_WEEKS_MIN = 4;
export const TARGET_TIMELINE_WEEKS_MAX = 104;

export const MEDICAL_CONDITIONS_OPTIONS = [
  { id: "diabetes-type1", label: "Diabetes Type 1", value: "diabetes-type1" },
  { id: "diabetes-type2", label: "Diabetes Type 2", value: "diabetes-type2" },
  { id: "hypertension", label: "High Blood Pressure", value: "hypertension" },
  { id: "heart-disease", label: "Heart Disease", value: "heart-disease" },
  { id: "thyroid", label: "Thyroid Disorders", value: "thyroid" },
  { id: "pcos", label: "PCOS", value: "pcos" },
  { id: "arthritis", label: "Arthritis", value: "arthritis" },
  { id: "asthma", label: "Asthma", value: "asthma" },
  { id: "depression", label: "Depression", value: "depression" },
  { id: "anxiety", label: "Anxiety", value: "anxiety" },
  { id: "sleep-apnea", label: "Sleep Apnea", value: "sleep-apnea" },
  {
    id: "high-cholesterol",
    label: "High Cholesterol",
    value: "high-cholesterol",
  },
];

export const PHYSICAL_LIMITATIONS_OPTIONS = [
  { id: "back-pain", label: "Back Pain/Issues", value: "back-pain" },
  { id: "knee-problems", label: "Knee Problems", value: "knee-problems" },
  { id: "shoulder-issues", label: "Shoulder Issues", value: "shoulder-issues" },
  { id: "neck-problems", label: "Neck Problems", value: "neck-problems" },
  { id: "ankle-issues", label: "Ankle/Foot Issues", value: "ankle-issues" },
  { id: "wrist-problems", label: "Wrist Problems", value: "wrist-problems" },
  { id: "balance-issues", label: "Balance Issues", value: "balance-issues" },
  {
    id: "mobility-limited",
    label: "Limited Mobility",
    value: "mobility-limited",
  },
];

export const STRESS_LEVELS = [
  {
    level: "low",
    title: "Low Stress",
    iconName: "happy-outline",
    gradient: ["#10B981", "#34D399"],
    description: "Generally relaxed, good work-life balance",
    impact: "Optimal conditions for aggressive goals",
  },
  {
    level: "moderate",
    title: "Moderate Stress",
    iconName: "remove-circle-outline",
    gradient: ["#F59E0B", "#FBBF24"],
    description: "Normal daily stress, manageable workload",
    impact: "Standard approach recommended",
  },
  {
    level: "high",
    title: "High Stress",
    iconName: "alert-circle-outline",
    gradient: ["#EF4444", "#F87171"],
    description: "High pressure job, poor sleep, or major life events",
    impact: "Conservative approach required for health",
  },
];

export const PHOTO_TYPES = [
  {
    type: "front" as const,
    title: "Front",
    iconName: "person-outline",
    shortDesc: "Face camera",
  },
  {
    type: "side" as const,
    title: "Side",
    iconName: "git-compare-outline",
    shortDesc: "Turn sideways",
  },
  {
    type: "back" as const,
    title: "Back",
    iconName: "return-up-back-outline",
    shortDesc: "Back to camera",
  },
];
