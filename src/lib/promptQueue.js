export function enqueuePrompt(queue, item) {
  return [...queue, item];
}

export function dropPrompt(queue, id) {
  return queue.filter((item) => item.id !== id);
}

export function takePrompt(queue, id) {
  const item = queue.find((entry) => entry.id === id) || null;
  if (!item) return { item: null, queue };
  return { item, queue: queue.filter((entry) => entry.id !== id) };
}

export function shiftPrompt(queue) {
  if (!queue.length) return { item: null, queue };
  return { item: queue[0], queue: queue.slice(1) };
}
