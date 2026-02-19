import { Achievement } from "../types";

export function createChallengeAchievements(): Achievement[] {
  return [
    {
      id: "challenge_rookie",
      category: "challenge",
      tier: "bronze",
      title: "Challenge Rookie",
      description: "Complete your first challenge",
      icon: "🎯",
      color: "#CD7F32",
      requirements: [{ type: "challenge_wins", target: 1 }],
      reward: {
        type: "fitcoins",
        value: 100,
        description: "100 FitCoins + Rookie Badge",
      },
    },
    {
      id: "challenge_veteran",
      category: "challenge",
      tier: "silver",
      title: "Challenge Veteran",
      description: "Complete 10 challenges",
      icon: "🎯🏅",
      color: "#C0C0C0",
      requirements: [{ type: "challenge_wins", target: 10 }],
      reward: {
        type: "fitcoins",
        value: 250,
        description: "250 FitCoins + Veteran Title",
      },
    },
    {
      id: "challenge_champion",
      category: "challenge",
      tier: "gold",
      title: "Challenge Champion",
      description: "Complete 25 challenges",
      icon: "🏆",
      color: "#FFD700",
      requirements: [{ type: "challenge_wins", target: 25 }],
      reward: {
        type: "fitcoins",
        value: 500,
        description: "500 FitCoins + Champion Title",
      },
    },
    {
      id: "speed_demon",
      category: "challenge",
      tier: "gold",
      title: "Speed Demon",
      description: "Complete a challenge in record time",
      icon: "⚡",
      color: "#FFD700",
      requirements: [
        {
          type: "custom",
          target: 1,
          metadata: { challenge_type: "record_time" },
        },
      ],
      reward: {
        type: "fitcoins",
        value: 300,
        description: "300 FitCoins + Speed Badge",
      },
    },
    {
      id: "endurance_master",
      category: "challenge",
      tier: "platinum",
      title: "Endurance Master",
      description: "Complete a 30-day challenge",
      icon: "🏃‍♂️💪",
      color: "#E5E4E2",
      requirements: [
        { type: "custom", target: 1, metadata: { challenge_type: "30_day" } },
      ],
      reward: {
        type: "fitcoins",
        value: 750,
        description: "750 FitCoins + Master Title",
      },
    },
    {
      id: "team_challenger",
      category: "challenge",
      tier: "silver",
      title: "Team Challenger",
      description: "Complete 5 team challenges",
      icon: "🤝",
      color: "#C0C0C0",
      requirements: [
        { type: "custom", target: 5, metadata: { challenge_type: "team" } },
      ],
      reward: {
        type: "fitcoins",
        value: 200,
        description: "200 FitCoins + Team Badge",
      },
    },
    {
      id: "solo_warrior",
      category: "challenge",
      tier: "gold",
      title: "Solo Warrior",
      description: "Complete 15 solo challenges",
      icon: "🥺",
      color: "#FFD700",
      requirements: [
        { type: "custom", target: 15, metadata: { challenge_type: "solo" } },
      ],
      reward: {
        type: "fitcoins",
        value: 400,
        description: "400 FitCoins + Warrior Title",
      },
    },
    {
      id: "ultimate_challenger",
      category: "challenge",
      tier: "legendary",
      title: "Ultimate Challenger",
      description: "Complete 50 challenges with 90%+ success rate",
      icon: "👑🎯",
      color: "#FF6B6B",
      requirements: [
        { type: "custom", target: 1, metadata: { challenge_type: "ultimate" } },
      ],
      reward: {
        type: "title",
        value: "Ultimate Challenger",
        description: "Exclusive Ultimate Title + 1000 FitCoins",
      },
    },
  ];
}
