---
trigger: always_on
---

# Environment 
- Before adding any new feature or capability first setup and validate the development environment 

# General Code Style & Formatting
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Follow Expo's official documentation for setting up and configuring projects.

# Naming Conventions
- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

# TypeScript Best Practices
- Use TypeScript for all code; prefer interfaces over types.
- Avoid any and enums; use explicit types and maps instead.
- Use functional components with TypeScript interfaces.
- Enable strict mode in TypeScript for better type safety.

# Syntax & Formatting
- Use the function keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.

# Styling & UI
- Use Expo's built-in components for common UI patterns and layouts.
- Implement responsive design with Flexbox and useWindowDimensions.
- Use styled-components or Tailwind CSS for styling.
- Implement dark mode support using Expo's useColorScheme.
- Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.
- Use react-native-reanimated and react-native-gesture-handler for performant animations and gestures.
- Make components reusable and reuse them where possible

# Firebase back-end
- Leverage Firebase over the MCP to serve as the back-end for authentication, storage and real time applications.

# Testing & Debugging
use  **Jest**  (with  npx jest  and watch/affected-only modes) for unit and integration tests , employ  **Jest snapshots**  for UI regression detection and commit them alongside code changes , leverage  **Detox CLI**  (detox init,  detox build,  detox test) for reliable end-to-end flows with reset state between scenarios , gate every merge on passing  **CLI-invoked**  tests, linting (npx eslint), and formatting checks (npx prettier --check) within CI pipelines , enforce  **regression tests**  and “no-change” assertions on core modules , and follow a  **red–green–refactor**  TDD cycle to build new features atop a stable foundation .

**Always run existing tests before making changes**
- On every new implementation request, execute the full test suite (unit, integration, and E2E) to detect regressions immediately.
- If any test fails, halt further development until the root cause is identified and resolved.
		
**Write integration tests for every new feature or API interaction**
- Cover interactions between modules, services, and external dependencies.
- Mock external services only where network calls are non-deterministic, otherwise prefer real integrations in a sandbox environment.
- Aim for ≥ 80 % coverage on all modules.
	
**Write end-to-end (E2E) tests for all user-facing flows**
- Simulate real user journeys (e.g., signup → onboarding → data entry → logout).
- Use a headless runner (e.g., Cypress, Detox) configured to reset state between scenarios.
- Keep each scenario atomic: one user story per test.

**Gate new code behind a passing test suite**
-  Do not merge or deploy any code unless all tests (unit, integration, E2E, lint, type checks) succeed.
-  Automate test runs in CI with required status checks.

**Prevent unintended changes (regressions)**
-  Use snapshot or contract tests for critical UI components and data-shaping functions, updating snapshots only when the intent is explicit.
-  Include “no-change” assertions on shared helpers and core utilities to guard against accidental edits.

**Maintain a solid foundation**
-   Refactor only when accompanied by test updates: any behavior change in production code must be reflected in tests first.
-   After refactoring, ensure coverage percentage does not decrease.
     
- **Continuous feedback loop**
-   On test failures, Windsurf should provide a clear summary of failing tests, logs, and stack traces.
-   Encourage “red–green–refactor”: first write a failing test, make it pass, then clean up code.

## Error Handling

- Don't swallow errors, always handle them appropriately
- Handle promises and async/await gracefully
- Consider the unhappy path and handle errors appropriately
- Context without sensitive data