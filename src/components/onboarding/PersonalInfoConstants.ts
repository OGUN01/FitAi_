export interface CountryState {
  name: string;
  states: string[];
}

export const COUNTRIES_WITH_STATES: CountryState[] = [
  {
    name: "United States",
    states: [
      "California",
      "Texas",
      "Florida",
      "New York",
      "Pennsylvania",
      "Illinois",
      "Ohio",
      "Georgia",
      "North Carolina",
      "Michigan",
    ],
  },
  {
    name: "India",
    states: [
      "Maharashtra",
      "Gujarat",
      "Karnataka",
      "Tamil Nadu",
      "Uttar Pradesh",
      "West Bengal",
      "Rajasthan",
      "Madhya Pradesh",
      "Andhra Pradesh",
      "Kerala",
    ],
  },
  {
    name: "Canada",
    states: [
      "Ontario",
      "Quebec",
      "British Columbia",
      "Alberta",
      "Manitoba",
      "Saskatchewan",
      "Nova Scotia",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Prince Edward Island",
    ],
  },
  {
    name: "United Kingdom",
    states: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  {
    name: "Australia",
    states: [
      "New South Wales",
      "Victoria",
      "Queensland",
      "Western Australia",
      "South Australia",
      "Tasmania",
      "Australian Capital Territory",
      "Northern Territory",
    ],
  },
  {
    name: "Germany",
    states: [
      "North Rhine-Westphalia",
      "Bavaria",
      "Baden-Württemberg",
      "Lower Saxony",
      "Hesse",
      "Saxony",
      "Rhineland-Palatinate",
      "Berlin",
    ],
  },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male", iconName: "man-outline" },
  { value: "female", label: "Female", iconName: "woman-outline" },
  { value: "other", label: "Other", iconName: "people-outline" },
  {
    value: "prefer_not_to_say",
    label: "Prefer not to say",
    iconName: "lock-closed-outline",
  },
] as const;

export const OCCUPATION_OPTIONS = [
  {
    value: "desk_job",
    label: "Desk Job",
    iconName: "laptop-outline",
    gradient: ["#FF6B35", "#FF8A5C"],
    description: "Office worker, programmer, student - mostly sitting",
  },
  {
    value: "light_active",
    label: "Light Activity",
    iconName: "walk-outline",
    gradient: ["#3B82F6", "#06B6D4"],
    description: "Teacher, retail, light housework - some movement",
  },
  {
    value: "moderate_active",
    label: "Moderate Activity",
    iconName: "fitness-outline",
    gradient: ["#10B981", "#14B8A6"],
    description: "Nurse, server, active parent - regular movement",
  },
  {
    value: "heavy_labor",
    label: "Heavy Labor",
    iconName: "construct-outline",
    gradient: ["#F59E0B", "#EF4444"],
    description: "Construction, farming, warehouse - physical work",
  },
  {
    value: "very_active",
    label: "Very Active",
    iconName: "barbell-outline",
    gradient: ["#EF4444", "#DC2626"],
    description: "Athlete, trainer, manual labor - constant activity",
  },
] as const;
