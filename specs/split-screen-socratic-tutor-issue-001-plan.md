# Feature: Split-screen Socratic Code Tutor (ISSUE-001)

## Feature Description
A minimal, clean split-screen web page: left pane is a code editor where a student pastes a code snippet (C++, Python, etc.). Right pane is a chat interface driven by a Socratic AI tutor that never gives direct answers but asks guiding questions to help the student reason about their code.

## User Story
As a student
I want to paste a snippet of code and receive guided Socratic questions
So that I can reason about and understand my code without being given direct answers

## Problem Statement
Students often get stuck when reading or debugging code because a direct answer reduces learning. We need an interface that encourages active reasoning by only asking questions.

## Solution Statement
Provide a split-screen app combining an embeddable code editor and a chat UI backed by an AI tutoring API. The AI will be constrained to a Socratic policy: never provide the answer, only questions. The UI will be minimal and accessible.

## Relevant Files
Use these files to implement the feature (existing + new):
- Existing frontend scaffold: `frontend/src/` — contains app structure and islands.
- Frontend entry: `frontend/src/main.ts` — integrate new route/component here.
- Templates: `src/app/templates/` — if server-side templating is used for initial HTML.
- E2E tests: `e2e/` — add Playwright tests for the flow.

New files to create:
### New Files
- `frontend/src/islands/socratic/TeacherIsland.tsx` — React island for the chat UI.
- `frontend/src/islands/socratic/EditorIsland.tsx` — React island wrapping the code editor.
- `frontend/src/islands/socratic/index.tsx` — island entry aggregating components.
- `frontend/styles/socratic.css` — minimal styles for layout and accessibility.
- `src/app/controllers/socratic.py` (optional) — backend API route for proxying AI requests and enforcing the Socratic policy server-side.
- `specs/split-screen-socratic-tutor-issue-001-plan.md` — this spec (created).
- `e2e/socratic.spec.ts` — Playwright E2E tests validating UI and Socratic behavior.

## Implementation Plan
### Phase 1: Foundation
- Decide editor library: Monaco (VSCode-like) or CodeMirror (lighter). Document tradeoffs and chosen library.
- Decide where AI calls run: frontend directly to LLM provider (requires client key) or backend proxy (recommended for security and to enforce Socratic rules).
- Add required npm packages to `frontend/package.json` (e.g., `@monaco-editor/react` or `codemirror`, `swr` or `axios` for API calls).

### Phase 2: Core Implementation
- Build split-screen responsive layout with two panes (left editor, right chat) and collapsible/resizable divider.
- Implement `EditorIsland` containing the code editor. Features: paste, language selection (optional), initial example text, and copy/clear buttons.
- Implement `TeacherIsland` chat UI: message list, input (student prompts / clarifying questions), and streaming responses support.
- Implement API layer:
  - If backend proxy: create `POST /api/socratic` that accepts { code, conversation } and calls LLM with a strict system prompt that enforces Socratic-only behavior.
  - Include safety: rate-limiting, input size checks, and API error handling.
- Implement frontend integration: send initial message containing the pasted code so AI can ask questions about it.

### Phase 3: Integration
- Wire islands into existing pages or a new route (e.g., `/socratic-tutor`). Ensure initial HTML loads islands.
- Add CSS for minimal, clean look and responsive behavior. Ensure accessibility: keyboard nav, ARIA labels.
- Implement tests: unit tests for UI components (vitest) and E2E tests (Playwright) to validate the Socratic constraint.

## Step by Step Tasks
### 1. Prepare spec and get approval
- Create this spec file and present to stakeholder (you) for approval and clarifying decisions.

### 2. Decide key architecture choices (ask questions)
- Choose editor library: Monaco vs CodeMirror.
- Choose AI integration: backend proxy vs direct client integration.
- Which languages to support initially (C++, Python, JS)?

### 3. Create frontend scaffold and install dependencies
- Add chosen editor package and chat UI helpers to `frontend/package.json` and run install.
- Add an `islands/socratic` folder and placeholder files.

### 4. Implement split-screen layout and CSS
- Create responsive layout with accessible semantics.
- Add resizable divider if feasible.

### 5. Implement `EditorIsland`
- Wrap editor library, support paste and language selection, expose current code state.

### 6. Implement `TeacherIsland`
- Chat UI with message list, input, and send button.
- Implement streaming UI (spinner / typing indicator).

### 7. Implement backend `POST /api/socratic` (recommended)
- Validate inputs and enforce Socratic policy in the system prompt.
- Proxy to LLM provider (OpenAI / Anthropic / local model). Include config for provider and API key usage.

### 8. Integrate frontend with backend
- Send the pasted code as initial context; subsequent messages include conversation history.
- Ensure responses are only questions; handle policy violations (server-side re-check).

### 9. Testing
- Unit tests for EditorIsland and TeacherIsland (vitest/react-testing-library).
- E2E Playwright tests to simulate paste, send, and assert AI responses are questions (regex-based assertion: line ends with question mark or starts with question word).

### 10. Documentation and finalization
- Add README with usage and environment variable instructions for AI keys.
- Final review and prepare branch for implementation.

Your last step will be to run the Validation Commands below and confirm tests pass.

## Testing Strategy
### Unit Tests
- Editor: paste handling, language switching, and state updates.
- Chat UI: message rendering, input handling, and loading states.

### Edge Cases
- Very large pasted files (enforce size cap, e.g., 20 KB).
- Non-code input (explain behavior: still accept but AI should ask clarifying code-related questions).
- AI returns non-question content: server-side validator will re-prompt or redact.
- Network failures and timeouts.

## Acceptance Criteria
- Minimal split-screen UI where student can paste code and open the chat.
- AI responses must be only questions in normal operation.
- Accessible and responsive layout.
- Unit tests + E2E tests verifying core flows and Socratic constraint.

## Validation Commands
- Frontend install and build:
```bash
cd frontend
npm install
npm run build
```
- Start dev servers (project README scripts):
```bash
script/server
```
- Run unit tests:
```bash
script/test  # runs pytest + vitest
```
- Run E2E tests:
```bash
script/test-e2e  # runs Playwright tests
```
- Run the specific E2E for Socratic tutor:
```bash
npx playwright test e2e/socratic.spec.ts --project=chromium --reporter=list
```

## Notes / Clarifying Questions
Please answer these before I begin implementation:
1. Which editor library do you prefer: Monaco (feature-rich) or CodeMirror (lighter)?
2. Should AI calls go through a backend proxy (recommended) or directly from the browser?
3. Which programming languages should be supported at launch (C++ required by your example)?
4. Do you have a preferred LLM provider (OpenAI, Anthropic, local) or existing API keys to use?
5. Any constraints on hosting, privacy, or rate limits I should plan for?

---

## Report
- Created todo list tracking tasks for this feature.
- Created spec file: `specs/split-screen-socratic-tutor-issue-001-plan.md` (this file).

Please review the spec and answer the clarifying questions above so I can finalize the plan and start implementation.

## Configuration Choices (user-provided)

- Editor library: `@monaco-editor/react@^4.6.0` (Monaco).
- AI integration: Backend proxy via Flask (`POST /api/socratic`).
- Initial languages: C++ and Python.
- LLM provider: OpenRouter (user will provide API key separately).
- Deployment constraints: Local dev prototype; no additional hosting/privacy constraints.

These choices will be used for the implementation tasks below.

## Implementation Notes for OpenRouter + Flask

- Backend will read `OPENROUTER_API_KEY` from environment and proxy requests to OpenRouter.
- The Flask endpoint will enforce a strict system prompt that instructs the model to only ask Socratic questions and never provide direct answers or code patches.
- Backend dependencies (add to `pyproject.toml` or `requirements.txt`): `Flask`, `httpx` (or `requests`), and optionally `python-dotenv` for local env loading.
- Frontend dependencies (add to `frontend/package.json`): `@monaco-editor/react@^4.6.0`, `monaco-editor` (peer), and `axios` (or `swr`/`fetch`).

## Updated Validation Commands

- Frontend install and build:
```bash
cd frontend
npm install @monaco-editor/react@^4.6.0 monaco-editor axios
npm run build
```
- Backend install (project root):
```bash
pip install -r requirements.txt  # ensure Flask and httpx/requests are listed
```

--

If this matches your intent, say "approve" and I will begin implementing the frontend scaffold, Flask proxy, and example integration. If you want any changes (e.g., add streaming responses, or support an additional language), tell me now.
