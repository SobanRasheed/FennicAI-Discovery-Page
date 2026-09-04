---
question: >
  An HTTP client requests a resource with If-None-Match: "v3-8f2c" and the
  server's current ETag for that resource is still "v3-8f2c". Which status
  code does the server return, and what does the response body contain?
type: mcq
subject: web-development
level: bs-computer-science
chapter: http-fundamentals
topics:
  - http-methods
  - rest-apis
examTag: University midterm
difficulty: medium
options:
  - 200 OK, with the full resource in the body
  - 304 Not Modified, with no body
  - 404 Not Found, because the version is unchanged
  - 301 Moved Permanently, pointing at a new ETag
answer: 304 Not Modified, with no body
explanation: >
  A matching ETag means the client's cached copy is still current, so the
  server tells it to reuse the cache instead of re-downloading. 304
  carries only headers (it may refresh caching metadata like Cache-Control
  or a new expiry), never a body. 200 with the full body would defeat the
  entire purpose of conditional requests, and 404 or 301 describe
  different situations entirely: a missing resource and a permanent move.
---

## Why conditional requests matter

The ETag is a version fingerprint. The client sends its cached version's
tag back with If-None-Match; if it matches, the exchange costs one
small header-only response instead of the full resource. See
[HTTP fundamentals](/notes/http-fundamentals/) for the caching flow.
