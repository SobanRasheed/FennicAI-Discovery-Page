---
question: >
  A client sends the same DELETE request to /orders/55 twice. The first
  request succeeds. What property of DELETE does the second request
  demonstrate, and what status code is a reasonable response?
type: mcq
subject: web-development
level: bs-computer-science
chapter: rest-apis
topics:
  - rest-apis
  - http-methods
  - crud-operations
examTag: University midterm
difficulty: medium
options:
  - Safety, and 404 is reasonable because the resource is already gone
  - Idempotency, and 204 or 404 is reasonable because the end state is unchanged
  - Idempotency, and 200 must be returned to prove the request worked
  - Cacheability, and 304 is reasonable because nothing was modified
answer: Idempotency, and 204 or 404 is reasonable because the end state is unchanged
explanation: >
  Idempotency means repeating a request leaves the resource in the same
  final state. After the first DELETE, order 55 is gone, so the second
  DELETE changes nothing: whether the server answers 204 (treat the
  delete as done) or 404 (report the resource absent), the end state is
  identical. Safety is the stronger property of never changing state,
  which DELETE does not have. 304 relates to conditional GET caching.
---

## The distinction this question probes

Safe and idempotent are often conflated. DELETE is idempotent but not
safe: the first call does destroy data. GET, HEAD, and OPTIONS are both.
POST is neither, which is why payment endpoints add idempotency keys
before allowing client retries.
