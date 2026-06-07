import {useCallback, useEffect, useRef, useState} from "react";
import type {Difficulty} from "hodoku-ts";

export interface SudokuRating {
  difficulty: Difficulty;
  score: number;
  solved: boolean;
}

interface RateWorkerMessage {
  key: string;
  rating: SudokuRating | null;
  error: string | null;
}

export interface RatingRequest {
  key: string;
  board: string;
}

/**
 * Rates sudokus off the main thread. Results stream back into `ratings` as each
 * puzzle finishes, so the grid stays interactive while difficulties fill in.
 */
export function useSudokuRatings() {
  const workerRef = useRef<Worker | null>(null);
  const [ratings, setRatings] = useState<Record<string, SudokuRating>>({});
  // Tracks keys already sent so repeated page visits don't re-rate the same puzzle.
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const worker = new Worker(new URL("../workers/sudoku-rate.worker.ts", import.meta.url), {type: "module"});
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<RateWorkerMessage>) => {
      const {key, rating} = event.data;
      if (rating) {
        setRatings((prev) => ({...prev, [key]: rating}));
      }
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
    };
  }, []);

  const requestRatings = useCallback((requests: RatingRequest[]) => {
    const worker = workerRef.current;
    if (!worker) {
      return;
    }
    for (const {key, board} of requests) {
      if (requestedRef.current.has(key)) {
        continue;
      }
      requestedRef.current.add(key);
      worker.postMessage({key, board});
    }
  }, []);

  return {ratings, requestRatings};
}
