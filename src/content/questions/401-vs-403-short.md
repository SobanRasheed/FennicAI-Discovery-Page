---
question: >
  In one sentence each, distinguish HTTP status codes 401 and 403.
type: short
subject: web-development
level: bs-computer-science
chapter: http-fundamentals
topics:
  - http-methods
examTag: University midterm
difficulty: easy
answer: >
  401 Unauthorized means the request lacks valid authentication: the
  server does not know who the caller is. 403 Forbidden means the caller
  is authenticated but not permitted to perform the operation.
explanation: >
  401 is the "who are you" response and a compliant client should respond
  by supplying or refreshing credentials. 403 is the "you may not"
  response: re-authenticating will not help, because the identity is
  known and lacks permission. The naming is a historical trap: 401 is
  actually about authentication, not authorization, which is why
  remembering the pairing (401 authenticate, 403 authorize) matters more
  than the label.
---

## One-line exam version

401: not authenticated. 403: authenticated, not authorized.
