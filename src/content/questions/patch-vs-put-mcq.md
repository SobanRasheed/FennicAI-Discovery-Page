---
question: >
  Which HTTP method should a client use to partially update a resource,
  sending only the fields that change?
type: mcq
subject: web-development
level: bs-computer-science
chapter: rest-apis
topics:
  - rest-apis
  - http-methods
examTag: University midterm
difficulty: easy
options:
  - GET, because it is safe and cacheable
  - PUT, because it replaces the whole resource
  - PATCH, because it applies a change document to the resource
  - POST, because any update can be a POST
answer: PATCH, because it applies a change document to the resource
explanation: >
  PATCH is defined for partial modification: fields it omits are left
  untouched. PUT means full replacement, so omitting a field would erase
  it. GET never modifies state, and while POST can technically carry an
  update, it breaks the uniform interface that REST expects.
---

## Why the other options fail

- **GET** is safe: it must never change server state, and caches may replay
  it.
- **PUT** replaces the entire representation. A PUT that omits a field is
  specifying that the field be removed, which is exactly the bug the
  question is testing for.
- **POST** creates resources in a collection. Tunneling updates through
  POST hides the operation from generic HTTP tooling.
