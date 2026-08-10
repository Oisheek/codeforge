import readline from "node:readline";

export function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
    historySize: 1000,
    terminal: true,
  });
}