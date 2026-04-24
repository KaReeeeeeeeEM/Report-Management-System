const { TextEncoder } = require("node:util");

function encodeUtf8(value) {
  return Uint8Array.from(Buffer.from(value, "utf8"));
}

function computeSafeRead(source, writtenBytes) {
  if (writtenBytes <= 0) {
    return 0;
  }

  let consumedBytes = 0;
  let read = 0;

  for (const character of source) {
    const characterByteLength = Buffer.byteLength(character, "utf8");

    if (consumedBytes + characterByteLength > writtenBytes) {
      break;
    }

    consumedBytes += characterByteLength;
    read += character.length;
  }

  return read;
}

function patchTextEncoder() {
  if (!TextEncoder?.prototype || TextEncoder.prototype.__rmsEncodeIntoShimApplied) {
    return;
  }

  Object.defineProperty(TextEncoder.prototype, "encode", {
    configurable: true,
    writable: true,
    value(input = "") {
      return encodeUtf8(String(input));
    },
  });

  Object.defineProperty(TextEncoder.prototype, "encodeInto", {
    configurable: true,
    writable: true,
    value(input = "", destination) {
      const encoded = encodeUtf8(String(input));
      const written = Math.min(encoded.length, destination.length);

      destination.set(encoded.subarray(0, written), 0);

      return {
        read: computeSafeRead(String(input), written),
        written,
      };
    },
  });

  Object.defineProperty(TextEncoder.prototype, "__rmsEncodeIntoShimApplied", {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
}

patchTextEncoder();

if (typeof globalThis.TextEncoder === "function") {
  globalThis.TextEncoder = TextEncoder;
}
