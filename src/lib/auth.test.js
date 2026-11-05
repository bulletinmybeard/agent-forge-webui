/**
 *   node src/lib/auth.test.js
 */
import { shouldNotifyUnauthorized } from "./auth.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assert failed");
};

assert(shouldNotifyUnauthorized("/api/sessions", 401) === true, "api 401");
assert(shouldNotifyUnauthorized("/api/auth/login", 401) === false, "login 401");
assert(shouldNotifyUnauthorized("https://chat.example/api/auth/login", 401) === false, "absolute login");
assert(shouldNotifyUnauthorized("/api/sessions", 200) === false, "ok");
assert(shouldNotifyUnauthorized("/api/auth/me", 401) === true, "me 401");

console.log("auth.test.js ok");
