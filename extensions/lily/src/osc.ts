import * as dgram from "node:dgram";

/**
 * Minimal OSC encoder — just enough to push string payloads at Lily's OSC
 * server (UDP, fire-and-forget). Avoids pulling an osc dependency into the
 * extension bundle.
 */

/** OSC strings are null-terminated and zero-padded to 4-byte boundaries. */
const oscString = (s: string): Buffer => {
  const len = Buffer.byteLength(s, "utf8") + 1; // +1 for the terminator
  const buf = Buffer.alloc(Math.ceil(len / 4) * 4);
  buf.write(s, 0, "utf8");
  return buf;
};

/** Send an OSC message whose args are all strings. */
export function sendOscStrings(
  address: string,
  args: string[],
  port: number,
  host = "127.0.0.1"
): void {
  const message = Buffer.concat([
    oscString(address),
    oscString("," + "s".repeat(args.length)),
    ...args.map(oscString)
  ]);
  const socket = dgram.createSocket("udp4");
  socket.send(message, port, host, (err) => {
    if (err) console.log("[lily:osc] send failed:", err);
    socket.close();
  });
}
