---
type: "manual"
---

# FitAI - Official Coding Standards

These standards are derived from the **MANDATORY CRITICAL THINKING & 100% CONFIDENCE PROTOCOL** and are non-negotiable.

## 1. Code Implementation

*   **No Assumption-Based Code:** Every line of code must be justified by evidence and a clear plan. Do not write code based on guesses about what might work.
*   **Precise Solutions:** Your implementation must directly match the "EXACT SOLUTION" you declared in your 100% Confidence statement. No deviations are permitted without starting the protocol over.
*   **Clarity and Simplicity:** Write code that is easy to understand. Favor clarity over cleverness. Add comments to explain *why* something is done, not just *what* is being done, especially for complex logic.
*   **Defensive Programming:** Anticipate potential errors. Handle nulls, undefined values, and API failures gracefully. All error handling must be intentional and robust.

## 2. Code Style & Formatting

*   **Automated Formatting:** ESLint and Prettier are configured for this project. All code must be formatted correctly before being committed. No unformatted code will be accepted.
*   **TypeScript Strictness:** The project uses TypeScript's `strict` mode. There should be no `any` types unless a valid, documented justification is provided. All types must be explicit and correct.
*   **Naming Conventions:**
    *   Components: `PascalCase` (e.g., `PersonalInfoScreen.tsx`)
    *   Functions/Variables: `camelCase` (e.g., `handleNext`)
    *   Types/Interfaces: `PascalCase` (e.g., `interface UserState`)
    *   Constants: `UPPER_SNAKE_CASE` (e.g., `const API_TIMEOUT = 10000;`)

## 3. Component Design

*   **Single Responsibility:** Components should do one thing well. Decompose large components into smaller, reusable ones.
*   **State Management:** Use Zustand for global state. Local component state (`useState`) should be used for UI-specific state that doesn't need to be shared.
*   **Props:** Define clear `interface` for component props. Avoid optional props where a value is always required.

## 4. Asynchronous Code

*   **`async/await`:** Use `async/await` for all asynchronous operations for readability and cleaner error handling.
*   **Error Handling:** Every `await` call must be wrapped in a `try...catch` block or be part of a function that has a centralized error handler. Unhandled promise rejections are a critical failure.

## 5. Security

*   **No Hardcoded Secrets:** API keys, tokens, and other secrets must **NEVER** be hardcoded. Use environment variables (`.env.*`) as defined in the deployment guide.
*   **Input Sanitization:** Though primarily a backend concern, do not trust any user input on the frontend. Use validation utilities before processing or sending data to the backend.