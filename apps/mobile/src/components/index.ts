/**
 * Components barrel — src/components/index.ts
 *
 * Re-exports all shared components (non-primitive UI pieces) so
 * screens can do:
 *   import { AppHeader, LoadingOverlay } from '@/components';
 *
 * Note: primitive tokens (Button, Card, etc.) live in @/components/ui
 */

export { AppHeader }      from './AppHeader';
export { LoadingOverlay } from './LoadingOverlay';
export { CalendarPicker } from './CalendarPicker';
export type { CalendarPickerRef } from './CalendarPicker';
