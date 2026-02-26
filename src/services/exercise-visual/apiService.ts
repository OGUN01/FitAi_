import { ExerciseData, ExerciseAPIResponse } from "./types";

const BASE_URL = "https://exercisedata.vercel.app/api/v1";

export async function fetchExercisePage(
  page: number = 1,
  limit: number = 10,
): Promise<ExerciseAPIResponse> {
  const errors: string[] = [];

  try {
    const offset = (page - 1) * limit;
    const response = await fetch(
      `${BASE_URL}/exercises?offset=${offset}&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    errors.push(`Vercel API failed: ${error}`);
  }

  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/exercises?offset=${(page - 1) * limit}`,
      {
        headers: {
          "X-Api-Key": process.env.EXPO_PUBLIC_API_NINJAS_KEY || "",
        },
      },
    );

    if (response.ok) {
      const exercises = await response.json();
      const transformedData = exercises.map((ex: any, index: number) => ({
        exerciseId: `ninja_${page}_${index}`,
        name: ex.name,
        gifUrl: `https://static.exercisedb.dev/media/placeholder_${ex.type?.toLowerCase() || "general"}.gif`,
        targetMuscles: [ex.muscle],
        bodyParts: [],
        equipments: [ex.equipment || "bodyweight"],
        secondaryMuscles: [],
        instructions: [ex.instructions || "Follow proper form and technique"],
      }));

      return {
        success: true,
        metadata: {
          totalPages: Math.ceil(1000 / limit),
          totalExercises: 1000,
          currentPage: page,
          previousPage: page > 1 ? `page=${page - 1}` : null,
          nextPage: `page=${page + 1}`,
        },
        data: transformedData,
      };
    }
  } catch (error) {
    errors.push(`API Ninjas failed: ${error}`);
  }

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json",
    );

    if (response.ok) {
      const allExercises = await response.json();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const exercises = allExercises.slice(startIndex, endIndex);

      const transformedData = exercises.map((ex: any) => ({
        exerciseId:
          ex.id || `free_${ex.name?.toLowerCase().replace(/\s+/g, "_")}`,
        name: ex.name,
        gifUrl:
          ex.images?.[0] ||
          `https://via.placeholder.com/400x300.gif?text=${encodeURIComponent(ex.name)}`,
        targetMuscles: ex.primaryMuscles || [],
        bodyParts: [],
        equipments: ex.equipment || ["bodyweight"],
        secondaryMuscles: ex.secondaryMuscles || [],
        instructions: ex.instructions || ["Follow proper form and technique"],
      }));

      return {
        success: true,
        metadata: {
          totalPages: Math.ceil(allExercises.length / limit),
          totalExercises: allExercises.length,
          currentPage: page,
          previousPage: page > 1 ? `page=${page - 1}` : null,
          nextPage: endIndex < allExercises.length ? `page=${page + 1}` : null,
        },
        data: transformedData,
      };
    }
  } catch (error) {
    errors.push(`Free Exercise DB failed: ${error}`);
  }

  console.error("❌ All exercise APIs failed:", errors);
  throw new Error(`All exercise APIs failed: ${errors.join(", ")}`);
}

export async function fetchExerciseById(
  id: string,
): Promise<ExerciseData | null> {
  try {
    const response = await fetch(`${BASE_URL}/exercises/${id}`);
    const data = await response.json();

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("Get exercise by ID failed:", error);
    return null;
  }
}

export async function fetchExercisesByBodyPart(
  bodyPart: string,
): Promise<ExerciseData[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/bodyparts/${encodeURIComponent(bodyPart)}/exercises`,
    );
    const result: ExerciseAPIResponse = await response.json();

    if (result.success) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("Get exercises by body part failed:", error);
    return [];
  }
}

export async function fetchExercisesByEquipment(
  equipment: string,
): Promise<ExerciseData[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/equipments/${encodeURIComponent(equipment)}/exercises`,
    );
    const result: ExerciseAPIResponse = await response.json();

    if (result.success) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("Get exercises by equipment failed:", error);
    return [];
  }
}

export async function fetchBodyParts(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/bodyparts`);
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error("Get body parts failed:", error);
    return [];
  }
}

export async function fetchEquipments(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/equipments`);
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error("Get equipments failed:", error);
    return [];
  }
}

export { BASE_URL };
