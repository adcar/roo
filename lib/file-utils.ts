/**
 * Helper function to construct file paths at runtime.
 * This avoids Turbopack static analysis warnings for dynamic file patterns.
 * Uses runtime string construction with template literals to prevent static analysis.
 */
export function getExerciseImagePath(relativePath: string): string {
  // Use template literals and runtime process.cwd() to avoid static analysis
  // Turbopack cannot statically analyze template literal paths
  const base = process.cwd();
  const path = `${base}/public/exercise-images/${relativePath}`;
  // Normalize the path to handle any platform differences
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Get the custom exercise images directory path
 */
export function getCustomExerciseImageDir(): string {
  // Use template literals to avoid static pattern detection
  const base = process.cwd();
  const path = `${base}/public/exercise-images/custom`;
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

