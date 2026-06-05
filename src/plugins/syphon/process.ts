// Syphon input is driven by IPC frame events, not by poiesis text.
// process() is a no-op.
export default function process(
  _instanceId: string,
  _inputs: { poiesis: string; config: unknown }[]
): void {}
