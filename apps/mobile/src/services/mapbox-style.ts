/**
 * Sanitizes a Mapbox layer style object by removing all undefined/null values
 * and replacing invalid visibility strings.
 * The Mapbox bridge crashes if any style prop is undefined or null.
 */
export function sanitizeLayerStyle<T extends Record<string, unknown>>(style: T): any {
  return Object.fromEntries(
    Object.entries(style).filter(([_, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'number' && !Number.isFinite(value)) return false;
      if (Array.isArray(value) && value.some((v) => v === undefined || v === null)) return false;
      return true;
    })
  );
}

/**
 * Sanitizes all layer props by removing undefined/null values.
 * This prevents the Mapbox bridge from crashing when a prop like 'filter' or 'minZoomLevel' is undefined.
 */
export function sanitizeLayerProps<T extends Record<string, unknown>>(props: T): T {
  return Object.fromEntries(
    Object.entries(props).filter(([_, v]) => v !== undefined && v !== null)
  ) as T;
}


