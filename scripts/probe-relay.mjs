import { performance } from "node:perf_hooks";
import { WebSocket, WebSocketServer } from "ws";

const eventLog = Array.from({ length: 10_000 }, (_, index) => ({
  sequence: index + 1,
  threadId: `thread-${String(index % 37).padStart(3, "0")}`,
  type: index % 11 === 0 ? "item/completed" : "item/delta",
  payload: `event-${index + 1}`,
}));

const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise((resolve) => server.once("listening", resolve));

const address = server.address();
if (typeof address === "string") throw new Error("预期 TCP 地址");
const url = `ws://127.0.0.1:${address.port}`;

server.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const request = JSON.parse(raw.toString());
    const missing = eventLog.filter((event) => event.sequence > request.lastAck);
    socket.send(JSON.stringify({
      commandId: request.commandId,
      replayFrom: request.lastAck + 1,
      replayTo: eventLog.length,
      events: missing,
    }));
  });
});

async function replay(lastAck, commandId) {
  const startedAt = performance.now();
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.send(JSON.stringify({ lastAck, commandId }));
  const response = await new Promise((resolve, reject) => {
    socket.once("message", (raw) => resolve(JSON.parse(raw.toString())));
    socket.once("error", reject);
  });
  socket.close();
  return { elapsed: performance.now() - startedAt, response };
}

const samples = [];
for (let index = 0; index < 120; index += 1) {
  const lastAck = 9_900 + (index % 90);
  samples.push(await replay(lastAck, `command-${index}`));
}

const duplicateA = await replay(9_995, "same-command");
const duplicateB = await replay(9_995, "same-command");
const durations = samples.map((sample) => sample.elapsed).sort((a, b) => a - b);
const p95 = durations[Math.floor(durations.length * 0.95)];

console.log(JSON.stringify({
  transport: "loopback WebSocket",
  retainedEvents: eventLog.length,
  reconnectSamples: samples.length,
  reconnectAndReplayP95Ms: Number(p95.toFixed(2)),
  replayIsContiguous: samples.every(({ response }) =>
    response.events.length === response.replayTo - response.replayFrom + 1
    && response.events.at(0)?.sequence === response.replayFrom
    && response.events.at(-1)?.sequence === response.replayTo),
  duplicateCommandStable: JSON.stringify(duplicateA.response) === JSON.stringify(duplicateB.response),
  caveat: "本机回环风险探针；公网 Relay、移动网络切换、加密和磁盘 WAL 仍需最小技术原型复测",
}, null, 2));

await new Promise((resolve) => server.close(resolve));
