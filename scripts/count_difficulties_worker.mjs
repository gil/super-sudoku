import {parentPort} from "node:worker_threads";
import {rate} from "hodoku-ts";

parentPort.on("message", (board) => {
  const {difficulty} = rate(board);
  parentPort.postMessage(difficulty ?? "invalid");
});
