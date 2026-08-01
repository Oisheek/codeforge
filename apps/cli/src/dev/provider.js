import dotenv from "dotenv";

dotenv.config();

import {
  createOpenRouter,
} from "../../../../packages/providers/index.js";

import {
  loadConfig,
} from "../../../../packages/config/index.js";

export async function testProvider() {
  console.log("\n===== Provider =====");

  const config = loadConfig();

  const provider =
    createOpenRouter(config);

  const model =
    config.models.fast;

  console.log(
    "model:",
    model
  );

  const response =
    await provider.chat({
      model,

      messages: [
        {
          role: "user",
          content:
            "Reply with exactly: CodeForge Provider OK",
        },
      ],
    });

  console.dir(
    response,
    {
      depth: null,
    }
  );
}