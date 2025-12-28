/**
 * Yields to the JS event loop (next macrotask).
 * Useful for chunking long-running work so the UI/game loop stays responsive.
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}


