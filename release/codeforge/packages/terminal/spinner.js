import ora from "ora";

export function createSpinner(text = "Loading...") {
  return ora({
    text,
    spinner: "dots",
    discardStdin: false
  });
}