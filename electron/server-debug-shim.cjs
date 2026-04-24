function printError(prefix, error) {
  if (error instanceof Error) {
    console.error(prefix, error.stack || error.message);
    return;
  }

  console.error(prefix, error);
}

process.on("uncaughtException", (error) => {
  printError("[desktop][uncaughtException]", error);
});

process.on("unhandledRejection", (error) => {
  printError("[desktop][unhandledRejection]", error);
});

const originalConsoleError = console.error.bind(console);

console.error = (...args) => {
  originalConsoleError(...args);

  for (const arg of args) {
    if (arg instanceof Error) {
      originalConsoleError("[desktop][console.error stack]", arg.stack || arg.message);
      continue;
    }

    if (
      arg &&
      typeof arg === "object" &&
      "message" in arg &&
      typeof arg.message === "string" &&
      arg.message.includes("encodeUTF8Into")
    ) {
      originalConsoleError("[desktop][console.error object]", JSON.stringify(arg, null, 2));
    }
  }
};
