---
type: "manual"
---

# FitAI - Mandatory Code Review Checklist

This checklist must be completed for every pull request. Failure to meet any of these points will result in the rejection of the PR.

## Phase 1: Confidence & Planning Verification

- [ ] **100% Confidence Declaration:** Is a complete and valid declaration present in the PR description or linked task?
    - [ ] Root Cause Identified?
    - [ ] Precise Location Specified?
    - [ ] Exact Solution Defined?
    - [ ] Verification Plan Included?
    - [ ] Success Criteria Measurable?
- [ ] **Evidence Provided:** Does the PR link to or include the evidence (logs, screenshots, network traces) that led to the root cause analysis?

## Phase 2: Implementation & Code Quality

- [ ] **Adherence to Solution:** Does the implemented code exactly match the proposed solution in the confidence declaration?
- [ ] **Coding Standards:** Does the code adhere to all rules in `coding-standards.md`?
    - [ ] No `any` types without justification?
    - [ ] Correct formatting (ESLint/Prettier pass)?
    - [ ] Proper naming conventions?
- [ ] **Error Handling:** Is all asynchronous code and potential failure point (e.g., JSON parsing) wrapped in robust `try...catch` blocks?
- [ ] **Security:** Are there any hardcoded secrets? Is user input handled safely?
- [ ] **Performance:** Are there any obvious performance bottlenecks (e.g., re-renders in loops, inefficient data processing)?
- [ ] **Documentation:** Have relevant comments been added? Has `README.md` or other documentation been updated if the change affects architecture or setup?

## Phase 3: Verification & Testing

- [ ] **Unit Tests:** Are new unit tests added for the new logic? Do all existing tests still pass?
- [ ] **Integration Tests:** Does the change break any other part of the application? (Has regression testing been performed?)
- [ ] **Verification Plan Executed:** Is there proof (e.g., a comment, screenshot) that the author executed their own verification plan and it was successful?
- [ ] **Database Verification:** (If applicable) Have changes been verified directly in the Supabase MCP (`mqfrwtmkokivoxgukgsz`)? Is RLS still correctly enforced?
- [ ] **Cross-Platform Check:** Has the change been tested on both Android and iOS (if applicable)?

## Phase 4: Final Quality Gate

- [ ] **No Side Effects:** Is the reviewer confident that this change introduces no new bugs?
- [ ] **Clarity:** Is the code's purpose clear and maintainable for the next developer?
- [ ] **TODO List Update:** Does this change complete a task on the `fitai_todo.md`? Has the author marked it as complete and updated the list as required?

**A pull request can only be merged if all checkboxes are ticked.**