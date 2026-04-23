# Antigravity IDE Conventions

Welcome to the `anywhere` monorepo. When assisting the user, specifically within `apps/mobile`, please adhere strictly to the following agentic conventions to maximize codebase readability and maintainability.

## 1. Feature-Based Architecture
The mobile application uses a feature-based structure rather than a type-based structure.
* **`core/`**: Houses global application state, essential configuration, shared hooks that transcend specific features, and base styling/theme files.
* **`services/`**: Contains low-level network clients, third-party API adapters, and socket integrations.
* **`ui/`**: Reserved for generic, presentation-only components (buttons, text inputs, bottom sheets, etc.) that have NO feature-specific business logic.
* **`features/<domain>/`**: Contains all logic specific to a domain (e.g., `auth`, `search`, `map`, `trips`). Each feature should encapsulate its own components, stores, hooks, and specific utilities.

## 2. File Naming
* **Kebab-Case Only**: All new files created in `src/` must be named using `kebab-case`. For example, `auth-store.ts`, `destination-preview-card.tsx`.
* **No CamelCase/PascalCase File Names**: Avoid `AppHeader.tsx` or `useAuth.ts` when creating new files.
* **Exceptions**: Files required by standard tools (like `app/` for Expo Router) maintain their required structural naming conventions.

## 3. Importing
* Prefer importing from local feature folders using relative paths, or absolute aliases mapping to the new structure.
* Expo router screens (in `app/`) should orchestrate UI by importing from `features/<domain>` and `ui/`.

## 4. Future Enforcement
* **Strict Adherence**: All future features, folders, and files MUST follow this feature-based, kebab-case structure. 
* **Refactoring Rule**: If you touch a file that follows the old naming/structural convention, you are encouraged to refactor it to the new standard as part of your task.

*By following these conventions, we ensure a scalable, modular, and agent-friendly environment!*
