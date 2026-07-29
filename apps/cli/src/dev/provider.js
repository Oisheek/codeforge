import dotenv from "dotenv";

dotenv.config();
import { createOpenRouter } from "../../../../packages/providers/index.js";
import { loadConfig } from "../../../../packages/config/index.js";

export async function testProvider() {
  console.log("\n===== Provider =====");

  const config = loadConfig();

  const provider = createOpenRouter(config);

  const response = await provider.chat({
    messages: [
      {
        role: "user",
        content: "Reply with exactly: CodeForge Provider OK",
      },
    ],
  });

  console.dir(response, { depth: null });
}