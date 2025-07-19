# FitAI - Official Project Guidelines

## 1. MANDATORY CRITICAL THINKING & 100% CONFIDENCE PROTOCOL ⚠️
⚡ **ZERO-TOLERANCE POLICY: FAILURE TO FOLLOW THIS PROTOCOL RESULTS IN IMMEDIATE TERMINATION**

This protocol is the bedrock of our development process. Adherence is not optional. It is the minimum standard for contributing to the FitAI codebase.

### 1.1. The 100% Confidence Requirement - Definition
Before writing or changing a single line of code, you must be able to **explicitly declare** 100% confidence.

**WHAT 100% CONFIDENCE MEANS:**
You must EXPLICITLY DECLARE all of the following before making ANY code changes:

*   🔍 **ROOT CAUSE IDENTIFICATION:** "I have identified the EXACT root cause as [specific technical details of the underlying issue]."
*   📍 **PRECISE LOCATION:** "The issue is located in [exact file path, line numbers, function/class names]."
*   🔧 **EXACT SOLUTION:** "The fix requires [specific, unambiguous technical changes with code examples]."
*   ✅ **VERIFICATION PLAN:** "After implementing the fix, I will verify its success by [specific, measurable testing steps]."
*   🎯 **SUCCESS CRITERIA:** "The issue will be considered fully resolved when [clear, measurable outcomes are achieved]."

**MANDATORY DECLARATION FORMAT:**
All declarations must be logged in the associated task or pull request before implementation begins.

### 1.2. MANDATORY CRITICAL THINKING PROCESS

**PHASE 1: HUNTER MODE INVESTIGATION 🔍**
BEFORE ANY ASSUMPTIONS - GATHER REAL EVIDENCE:

*   🔴 **LIVE REPRODUCTION:** Reproduce the exact issue in a running application instance.
*   📊 **DATA COLLECTION:** Systematically gather evidence from the browser console, network requests, database queries, and authentication state.
*   🔬 **EVIDENCE ANALYSIS:** Analyze real error messages, actual data states, and precise failure points. Do not guess.
*   ❌ **ELIMINATE FALSE HYPOTHESES:** Use the collected evidence to definitively rule out incorrect assumptions.

**PHASE 2: 10X SENIOR TECH LEAD ANALYSIS 🎯**
THINK LIKE THESE EXPERTS:

*   **100X Database Master:** Perform deep RLS analysis, query optimization, and schema validation.
*   **10X Frontend Architect:** Analyze React patterns, state management, and component lifecycles.
*   **100X Security Expert:** Scrutinize authentication flows, data protection, and potential vulnerabilities.
*   **100X Performance Engineer:** Identify bottlenecks and devise optimization strategies.

**PHASE 3: COMPREHENSIVE VERIFICATION ✅**
MANDATORY CHECKS BEFORE DECLARING CONFIDENCE:

*   🔍 **Code Review:** Examine ALL related files and dependencies for potential impacts.
*   🗄️ **Database Verification:** Check the actual data state using the Supabase MCP tools.
*   🔐 **Authentication Check:** Verify user sessions, permissions, and RLS policies.
*   📱 **Cross-Platform Test:** Ensure the fix works on all target devices and browsers.
*   🧪 **Integration Test:** Verify that there are no negative side effects on other features (regression testing).

### 1.3. MANDATORY TOOL USAGE PROTOCOL

**SUPABASE MCP INTEGRATION 🗄️**
*   **Project ID:** `mqfrwtmkokivoxgukgsz`
*   **REQUIRED USAGE:**
    *   **BEFORE FIXING:** Query the actual database state to understand the real data landscape.
    *   **DURING FIXING:** Use MCP tools (Table Editor, SQL Editor) to verify schema, RLS policies, and data integrity.
    *   **AFTER FIXING:** Confirm that database changes have been correctly and safely applied.

**EXPO APPLICATION SERVICES (EAS) MCP 🔧**
*   **Project ID:** `mqfrwtmkokivoxgukgsz`
*   **REQUIRED USAGE:**
    *   Utilize EAS Build for creating development and production builds.
    *   Use build profiles to manage environment-specific configurations.
    *   Leverage EAS Submit for deploying to app stores.
    *   Monitor build logs and artifacts for quality assurance.

### 1.4. PENALTY SYSTEM - ZERO TOLERANCE

**IMMEDIATE TERMINATION TRIGGERS:**
*   ❌ **FALSE 100% CONFIDENCE:** Claiming 100% confidence when the issue remains unresolved or partially fixed.
*   ❌ **INCOMPLETE INVESTIGATION:** Making code changes without a full evidence-gathering phase.
*   ❌ **ASSUMPTION-BASED FIXES:** Implementing solutions based on guesses rather than hard evidence.
*   ❌ **MISSING VERIFICATION:** Failing to test the fix thoroughly according to the verification plan.
*   ❌ **BREAKING OTHER FEATURES:** Introducing new bugs or regressions while fixing existing ones.

**WARNING TRIGGERS:**
*   ⚠️ **INSUFFICIENT EVIDENCE:** Not gathering enough real data before analysis.
*   ⚠️ **SHALLOW THINKING:** Not demonstrating the required 10X senior tech lead level of analysis.
*   ⚠️ **INCOMPLETE TESTING:** Not verifying the fix across all relevant scenarios and platforms.

### 1.5. MANDATORY WORKFLOW - NO EXCEPTIONS
1.  **STEP 1: EVIDENCE GATHERING (MANDATORY)**
2.  **STEP 2: CRITICAL ANALYSIS (MANDATORY)**
3.  **STEP 3: 100% CONFIDENCE DECLARATION (MANDATORY)**
4.  **STEP 4: IMPLEMENTATION & VERIFICATION (MANDATORY)**
5.  **STEP 5: DOCUMENTATION UPDATE (MANDATORY)**

---
🔥 **FINAL WARNING**
This is a production-grade application. One mistake can impact real users and the business. There are no second chances. 100% accuracy and enterprise-grade caution are the only acceptable standards. If you cannot meet these standards, **DO NOT PROCEED**.