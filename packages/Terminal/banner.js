import { readFileSync } from "node:fs";
import { colors } from "./colors.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8")
);

const VERSION = packageJson.version;

export function showBanner() {
  console.clear();

  const logo = `
 ██████╗ ██████╗ ██████╗ ███████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║     ██║   ██║██║  ██║█████╗  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║     ██║   ██║██║  ██║██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
╚██████╗╚██████╔╝██████╔╝███████╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
`;

  console.log(colors.primary(logo));

console.log(colors.bold(colors.text(`CodeForge AI v${VERSION}`)));
console.log(colors.muted("Terminal-Native AI Software Engineering Agent"));

  console.log(
    colors.primary(
      "────────────────────────────────────────────────────────────"
    )
  );

  console.log();
}
