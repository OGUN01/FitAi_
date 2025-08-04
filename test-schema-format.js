// Quick test to verify Google Gemini schema format
const testSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    items: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["name", "age"]
};

console.log("✅ Test schema (lowercase format):", JSON.stringify(testSchema, null, 2));

const oldSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    age: { type: "NUMBER" }
  }
};

console.log("❌ Old schema (uppercase format):", JSON.stringify(oldSchema, null, 2));
console.log("🔍 Schema format test complete");
