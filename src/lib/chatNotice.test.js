/**
 *   node src/lib/chatNotice.test.js
 */
import {
  CHAT_NOTICE_MS,
  CHAT_UNAVAILABLE,
  dismissChatNotice,
  sessionGone,
  showChatUnavailable,
  subscribeChatNotice,
} from "./chatNotice.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

assert(CHAT_NOTICE_MS === 10_000, "10 seconds");
assert(CHAT_UNAVAILABLE === "This chat isn't available.", "generic text");

const hinted = /access|delet|owner|account|share|permission|forbidden|not found|user/i;
assert(!hinted.test(CHAT_UNAVAILABLE), "text does not say why");

assert(sessionGone(404) === true, "404");
assert(sessionGone(401) === false, "401 stays on the login wall");
assert(sessionGone(403) === false, "403");
assert(sessionGone(200) === false, "200");
assert(sessionGone(500) === false, "500");

dismissChatNotice();
const start = Date.now();
showChatUnavailable();
let seen = null;
const stop = subscribeChatNotice((notice) => {
  seen = notice;
});
assert(seen.text === CHAT_UNAVAILABLE, "subscriber sees the text");
assert(seen.until >= start + CHAT_NOTICE_MS, "not shorter than 10 seconds");
assert(seen.until <= Date.now() + CHAT_NOTICE_MS, "not longer than 10 seconds");
dismissChatNotice();
assert(seen === null, "dismiss clears it");
stop();
showChatUnavailable();
assert(seen === null, "unsubscribed");
dismissChatNotice();

console.log("chatNotice: ok");
