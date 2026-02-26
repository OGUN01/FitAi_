const WORKING_GIF_MAP: Record<string, string> = {
  "mountain climber":
    "https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif",
  "push-up": "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif",
  burpee: "https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif",
  "jumping jack": "https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif",
  plank: "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif",
  squat: "https://media.giphy.com/media/1qfDiTQ8NURS8rSHUF/giphy.gif",
  lunge: "https://media.giphy.com/media/xUA7aN1MTCZx97V1Ic/giphy.gif",
  "sit-up": "https://media.giphy.com/media/3oKIPa2TdahY8LAAxy/giphy.gif",
  crunch: "https://media.giphy.com/media/3oKIPa2TdahY8LAAxy/giphy.gif",
  run: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  running: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "jump rope": "https://media.giphy.com/media/xT39CXg2h4KLxSKn5e/giphy.gif",
  "chest dip": "https://media.giphy.com/media/26uf23YtWnP5Y5vfW/giphy.gif",
  "pull-up": "https://media.giphy.com/media/26uf8NrpoNcLqfNHq/giphy.gif",
  "chin-up": "https://media.giphy.com/media/26uf8NrpoNcLqfNHq/giphy.gif",
  deadlift: "https://media.giphy.com/media/3oz8xRSfVxLo3kMvKw/giphy.gif",
  "dumbbell curl": "https://media.giphy.com/media/l4FGw4d101Sa0pGTe/giphy.gif",
  "barbell squat": "https://media.giphy.com/media/1qfDiTQ8NURS8rSHUF/giphy.gif",
  "kettlebell swing":
    "https://media.giphy.com/media/26uf1EjXKMhkv1pde/giphy.gif",
};

const DEFAULT_GIF =
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif";

export function fixBrokenCdnUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  if (originalUrl.includes("v1.cdn.exercisedb.dev")) {
    const fixedUrl = originalUrl.replace(
      "v1.cdn.exercisedb.dev",
      "static.exercisedb.dev",
    );
    return fixedUrl;
  }

  return originalUrl;
}

export function normalizeFallbackExerciseName(query: string): string {
  const normalized = query.toLowerCase().trim();

  if (normalized.includes("push") && normalized.includes("up"))
    return "Push-ups";
  if (normalized.includes("squat")) return "Squats";
  if (normalized.includes("lunge")) return "Lunges";
  if (normalized.includes("plank")) return "Plank";
  if (normalized.includes("burpee")) return "Burpees";
  if (normalized.includes("jump") && normalized.includes("jack"))
    return "Jumping Jacks";
  if (normalized.includes("mountain") && normalized.includes("climb"))
    return "Mountain Climbers";
  if (normalized.includes("high") && normalized.includes("knee"))
    return "High Knees";
  if (normalized.includes("butt") && normalized.includes("kick"))
    return "Butt Kicks";

  return query
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getFallbackGifUrl(query: string): string {
  const normalized = query.toLowerCase();

  if (normalized.includes("jump") && normalized.includes("jack")) {
    return "https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif";
  }
  if (normalized.includes("push") && normalized.includes("up")) {
    return "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
  }
  if (normalized.includes("plank")) {
    return "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif";
  }
  if (normalized.includes("mountain") && normalized.includes("climb")) {
    return "https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif";
  }
  if (normalized.includes("burpee")) {
    return "https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif";
  }

  return DEFAULT_GIF;
}

export function getWorkingGifUrl(
  exerciseName: string,
  originalQuery: string,
): string {
  const normalized = exerciseName.toLowerCase();
  const query = originalQuery.toLowerCase();


  if (WORKING_GIF_MAP[normalized]) {
    return WORKING_GIF_MAP[normalized];
  }

  if (normalized.includes("mountain") && normalized.includes("climb")) {
    return WORKING_GIF_MAP["mountain climber"];
  }
  if (normalized.includes("push") && normalized.includes("up")) {
    return WORKING_GIF_MAP["push-up"];
  }
  if (normalized.includes("burpee")) {
    return WORKING_GIF_MAP["burpee"];
  }
  if (normalized.includes("jumping") && normalized.includes("jack")) {
    return WORKING_GIF_MAP["jumping jack"];
  }
  if (normalized.includes("plank")) {
    return WORKING_GIF_MAP["plank"];
  }
  if (normalized.includes("squat")) {
    return WORKING_GIF_MAP["squat"];
  }
  if (normalized.includes("lunge")) {
    return WORKING_GIF_MAP["lunge"];
  }
  if (normalized.includes("sit") && normalized.includes("up")) {
    return WORKING_GIF_MAP["sit-up"];
  }
  if (normalized.includes("crunch")) {
    return WORKING_GIF_MAP["crunch"];
  }
  if (normalized.includes("run")) {
    return WORKING_GIF_MAP["run"];
  }
  if (normalized.includes("jump") && normalized.includes("rope")) {
    return WORKING_GIF_MAP["jump rope"];
  }
  if (normalized.includes("dip")) {
    return WORKING_GIF_MAP["chest dip"];
  }
  if (normalized.includes("pull") && normalized.includes("up")) {
    return WORKING_GIF_MAP["pull-up"];
  }
  if (normalized.includes("chin") && normalized.includes("up")) {
    return WORKING_GIF_MAP["chin-up"];
  }
  if (normalized.includes("curl")) {
    return WORKING_GIF_MAP["dumbbell curl"];
  }
  if (normalized.includes("kettlebell")) {
    return WORKING_GIF_MAP["kettlebell swing"];
  }

  if (normalized.includes("cardio") || query.includes("cardio")) {
    return "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif";
  }
  if (normalized.includes("strength") || query.includes("strength")) {
    return "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
  }
  if (normalized.includes("core") || query.includes("core")) {
    return "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif";
  }
  if (normalized.includes("stretch") || query.includes("flexibility")) {
    return "https://media.giphy.com/media/3oEjI5TqjzqZWQzKus/giphy.gif";
  }

  return DEFAULT_GIF;
}

export function inferTargetMuscles(query: string): string[] {
  const normalized = query.toLowerCase();

  if (normalized.includes("push") || normalized.includes("chest"))
    return ["pectorals"];
  if (normalized.includes("squat") || normalized.includes("leg"))
    return ["quadriceps", "glutes"];
  if (normalized.includes("pull") || normalized.includes("back"))
    return ["latissimus dorsi"];
  if (normalized.includes("shoulder") || normalized.includes("press"))
    return ["deltoids"];
  if (
    normalized.includes("core") ||
    normalized.includes("plank") ||
    normalized.includes("abs")
  )
    return ["abs"];
  if (
    normalized.includes("cardio") ||
    normalized.includes("jump") ||
    normalized.includes("run")
  )
    return ["cardiovascular system"];

  return ["full body"];
}
