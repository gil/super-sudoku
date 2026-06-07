import {rate} from "hodoku-ts";

// Worker message handler: rates a single puzzle (CPU-heavy full solve) off the main thread.
self.onmessage = (event) => {
  const {key, board} = event.data;

  try {
    const {score, difficulty, solved} = rate(board);
    self.postMessage({
      key,
      rating: {score, difficulty, solved},
      error: null,
    });
  } catch (error) {
    self.postMessage({
      key,
      rating: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
