/**
 *   node src/lib/promptQueue.test.js
 */
import { dropPrompt, enqueuePrompt, shiftPrompt, takePrompt } from "./promptQueue.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

const a = { id: "a", text: "one" };
const b = { id: "b", text: "two" };
const c = { id: "c", text: "three" };

let queue = enqueuePrompt([], a);
queue = enqueuePrompt(queue, b);
queue = enqueuePrompt(queue, c);
assert(queue.map((item) => item.id).join() === "a,b,c", "append keeps order");

queue = dropPrompt(queue, "b");
assert(queue.map((item) => item.id).join() === "a,c", "cancel drops one row");

const jumped = takePrompt(queue, "c");
assert(jumped.item.text === "three", "run now returns that row");
assert(jumped.queue.map((item) => item.id).join() === "a", "earlier rows stay queued");

const missing = takePrompt(jumped.queue, "nope");
assert(missing.item === null, "unknown id is a no-op");
assert(missing.queue.length === 1, "queue unchanged when id is missing");

const first = shiftPrompt(enqueuePrompt(enqueuePrompt([], a), c));
assert(first.item.id === "a", "head runs next");
assert(first.queue[0].id === "c", "tail stays");
assert(shiftPrompt([]).item === null, "empty queue has no head");

console.log("promptQueue.test.js ok");
