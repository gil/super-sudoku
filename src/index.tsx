import React from "react";
import {createRoot} from "react-dom/client";
import './i18n';

// Your top level component
import Root from "./Root";
import "./main.css";
import {hydrateCollections} from "./lib/database/collections";

async function main() {
  // Load collections from IndexedDB before the first render so the synchronous collection
  // selectors have data available.
  await hydrateCollections();
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(<Root />);
  }
}

main();
