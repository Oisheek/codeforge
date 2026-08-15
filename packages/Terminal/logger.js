import { colors } from "./colors.js";

function print(symbol, color, message = "") {
  console.log(
    color(`${symbol} ${String(message)}`)
  );
}

export const logger = {
  info(message) {
    print("ℹ", colors.info, message);
  },

  success(message) {
    print("✔", colors.success, message);
  },

  warn(message) {
    print("⚠", colors.warning, message);
  },

  error(message) {
    print("✖", colors.error, message);
  },

  debug(message) {
    if (process.env.DEBUG === "true") {
      print("•", colors.secondary, message);
    }
  },

  plain(message) {
    console.log(colors.text(message));
  },

  line() {
    console.log(
      colors.muted(
        "────────────────────────────────────────────────────────────────"
      )
    );
  },
};