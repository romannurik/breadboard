/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "ava";
import { run } from "@google-labs/breadboard/harness";
import { asRuntimeKit } from "../../src/index.js";
import Core from "@google-labs/core-kit";

test("relative paths are resolved prior to passing down to other boards", async (t) => {
  const config = {
    url: "../../../tests/relative-urls/data/main.json",
    base: new URL(import.meta.url),
    kits: [asRuntimeKit(Core)],
  };
  let output: string | undefined;
  for await (const result of run(config)) {
    if (result.type === "error") {
      t.fail(result.data.error.toString());
    } else if (result.type == "input" && result.data.node.id === "main-input") {
      result.reply({ inputs: { "next-path": "./invokee.json" } });
    } else if (
      result.type === "output" &&
      result.data.node.id === "main-output"
    ) {
      output = result.data.outputs.result?.toString();
    }
  }
  t.is(output, "./invokee.json");
});
