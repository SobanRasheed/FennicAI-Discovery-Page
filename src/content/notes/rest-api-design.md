---
title: 'REST API Design: Complete Study Notes'
seoTitle: 'REST API Design Notes: Methods, Resources, and Status Codes'
description: >
  Complete REST API study notes covering resources, HTTP methods, status
  codes, and design conventions, with examples and practice questions.
overview: >
  These notes define what REST is, walk through resource design and HTTP
  method usage with worked request and response examples, and end with the
  status code conventions every exam and interview expects you to know.
subject: web-development
level: bs-computer-science
chapter: rest-apis
topics:
  - rest-apis
  - http-methods
  - crud-operations
learningObjectives:
  - Define REST and state its core constraints
  - Design resource-oriented URLs for a given scenario
  - Choose the correct HTTP method for each CRUD operation
  - Select appropriate status codes for success and error cases
  - Explain why statelessness matters for scaling
keyTerms:
  - term: Resource
    definition: >
      Anything the API exposes at a URL: a user, an order, a collection.
      The resource is the thing, not the file or the database row.
  - term: Endpoint
    definition: >
      The combination of a URL and an HTTP method, for example GET /users,
      that identifies one operation the API supports.
  - term: Statelessness
    definition: >
      Each request carries everything the server needs to process it. The
      server stores no session memory between requests.
  - term: Idempotency
    definition: >
      A request is idempotent when repeating it produces the same result as
      making it once. GET, PUT, and DELETE are idempotent. POST is not.
  - term: Content negotiation
    definition: >
      The client and server agreeing on a representation format through the
      Accept and Content-Type headers.
importantPoints:
  - Nouns in URLs, verbs in HTTP methods. Never POST /createUser.
  - Plural collection URLs, /users, with /users/42 for a single item.
  - 201 Created belongs with a Location header pointing at the new resource.
  - 4xx means the client must change something, 5xx means the server failed.
  - Filtering and pagination belong in query parameters, not new endpoints.
formulas:
  - expression: 'CRUD to HTTP: Create=POST, Read=GET, Update=PUT|PATCH, Delete=DELETE'
    meaning: >
      The standard mapping used by RESTful APIs to express the four data
      operations over HTTP.
summary: >
  REST is an architectural style in which APIs expose resources at URLs and
  use HTTP methods as verbs: GET reads, POST creates, PUT replaces, PATCH
  partially updates, DELETE removes. Stateless requests let servers scale
  horizontally because no session memory ties a client to one machine.
  Correct status codes (2xx success, 4xx client error, 5xx server error)
  make APIs debuggable without reading their source.
faqs:
  - question: What is the difference between REST and SOAP?
    answer: >
      SOAP is a protocol with a strict XML message format and built-in
      WS-Security standards. REST is an architectural style that rides on
      HTTP, typically with JSON. REST is simpler and dominant on the public
      web; SOAP persists in enterprise and banking integrations.
  - question: Should API versioning go in the URL or a header?
    answer: >
      URL versioning like /v1/users is more common and easier to cache and
      debug. Header-based versioning keeps URLs clean but hides the version
      from logs. For exams and most real projects, answer URL versioning.
  - question: Why do people say PUT is idempotent but POST is not?
    answer: >
      Sending the same PUT twice leaves the resource in the same final
      state, the version you sent. Sending the same POST twice usually
      creates two resources, which is why payment endpoints add idempotency
      keys.
references:
  - title: 'Architectural Styles and the Design of Network-based Software Architectures (Fielding, 2000)'
    url: https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
    source: UC Irvine
  - title: HTTP Semantics RFC 9110
    url: https://www.rfc-editor.org/rfc/rfc9110
    source: IETF
  - title: MDN HTTP Reference
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP
    source: Mozilla
author: soban-rasheed
publishedDate: 2026-08-02
updatedDate: 2026-09-02
popular: true
---

## Introduction

Every web service you use, from weather apps to banking, talks to servers
through APIs, and most of those APIs follow REST. These notes treat REST as
a design discipline you can apply, not a buzzword to define and forget. By
the end you should be able to look at any API endpoint and judge whether it
is well designed, and defend that judgment in an exam answer.

## What REST Is

REST (Representational State Transfer) is an architectural style Roy
Fielding described in his 2000 dissertation. It is not a protocol, library,
or product. A RESTful system has these properties:

1. **Resources with identifiers.** Everything the API manages is addressable
   at a URL. `/users/42` is the user, not a page about the user.
2. **Uniform interface.** The same HTTP verbs and conventions apply to every
   resource. You do not invent per-resource operations.
3. **Statelessness.** Each request is self-contained. The server keeps no
   memory of what the client previously asked.
4. **Client-server separation.** The client evolves independently of the
   server, communicating only through representations of resources.
5. **Layered system and cacheability.** Responses declare whether they can
   be cached, so proxies and CDNs can sit between client and server.

An API that merely uses HTTP is not automatically RESTful. The distinction
examiners probe is whether the design follows the resource and uniform
interface constraints, or just tunnels procedure calls through GET and POST.

## Designing Resources

The first design decision is what your resources are. Take a food delivery
service:

- `/restaurants` is the collection of restaurants.
- `/restaurants/7` is one restaurant.
- `/restaurants/7/menu-items` is a sub-collection owned by that restaurant.
- `/orders/1003` is one order, addressed independently of who placed it.

Notice what is absent: verbs. There is no `/getOrder` or `/placeOrder`.
Creating an order is a verb applied to the orders collection:

```http
POST /orders
Content-Type: application/json

{
  "restaurantId": 7,
  "items": [{ "menuItemId": 42, "quantity": 2 }]
}
```

The server responds:

```http
HTTP/1.1 201 Created
Location: /orders/1003

{
  "id": 1003,
  "status": "confirmed",
  "total": 1420
}
```

### Non-resource design: what to avoid

```http
POST /placeOrder?action=create
GET /getOrderData?order_id=1003
```

These are RPC (remote procedure call) designs wearing an HTTP costume. They
fail the uniform interface constraint because every resource invents its own
operation names, and they are invisible to generic HTTP tooling, which
cannot assume GET requests are safe to cache or retry.

## HTTP Methods as the Verb Set

| Operation | Method | Idempotent | Safe | Typical success code |
|---|---|---|---|---|
| List a collection | GET | yes | yes | 200 |
| Retrieve one item | GET | yes | yes | 200 |
| Create an item | POST | no | no | 201 |
| Replace an item | PUT | yes | no | 200 or 204 |
| Apply partial changes | PATCH | not necessarily | no | 200 or 204 |
| Remove an item | DELETE | yes | no | 204 |
| Ask about capabilities | OPTIONS | yes | yes | 204 |

Two distinctions carry most of the exam weight:

**Safe versus idempotent.** Safe methods (GET, HEAD, OPTIONS) do not modify
server state. Idempotent methods (GET, PUT, DELETE, HEAD, OPTIONS) have the
same effect when repeated. DELETE is idempotent but not safe: deleting
resource 42 twice leaves the same end state, resource 42 is gone, but the
first call changed data.

**PUT versus PATCH.** PUT sends the complete replacement representation. A
PUT that omits a field should erase that field. PATCH sends a change
document:

```http
PATCH /orders/1003
Content-Type: application/json

{ "status": "cancelled" }
```

The order's items and totals survive because PATCH never touches fields it
does not mention.

## Status Codes

The five families:

- **2xx Success.** 200 OK for general success, 201 Created after POST, 204
  No Content when there is nothing to return (common after DELETE and
  sometimes PUT).
- **3xx Redirection.** 301 permanent move, 302 temporary, 304 Not Modified
  for cached content that is still valid.
- **4xx Client error.** 400 malformed syntax, 401 missing or invalid
  authentication, 403 authenticated but not permitted, 404 no such
  resource, 409 conflict with current state, 422 semantically invalid.
- **5xx Server error.** 500 unexpected failure, 502 bad gateway from an
  upstream, 503 temporarily unavailable.

The 401 versus 403 distinction trips many students: 401 means "I do not
know who you are", 403 means "I know who you are and you may not do this."

## Statelessness and Why It Matters

A stateless server treats every request as a stranger with credentials. All
identifying information, the auth token, the session data needed for the
operation, arrives in the request itself. The payoff is operational: any
server behind the load balancer can serve any request, so adding capacity
means adding machines, not migrating session state. The cost is that the
client does more work, sending its context with every call.

## Pagination, Filtering, and Sorting

Collections that can grow unboundedly need controls in the query string:

```http
GET /orders?status=active&page=2&per_page=25&sort=-created_at
```

Design guidance: filtering and sorting are query parameters, never separate
endpoints. Cursor-based pagination (`?after=1002`) scales better than
numeric pages when data changes between requests, because cursors cannot
skip or duplicate rows.

## Worked Example: Reviewing an API

You inherit this API:

```http
GET  /users/fetch?id=12
POST /users/delete
POST /users/update?id=12
```

A strong exam answer identifies all three violations and proposes the fix:

1. Fetch is a verb. `GET /users/12` uses the resource URL with the correct
   method, and the id moves out of the query string into the path.
2. Deletion should be `DELETE /users/12`, a single idempotent operation on
   the resource, not POST with an action in the body.
3. Updates should be `PATCH /users/12` with a JSON change document, or PUT
   if the client sends a complete replacement.

## Practice Scenarios

1. Design endpoints for a library system: books, members, and loans. Which
   resource does POST target when a member borrows a book?
   *Answer: POST /loans, because a loan is the resource being created.*
2. A client retries a timed-out `POST /payments` and is charged twice. Name
   the violated property and a standard mitigation.
   *Answer: POST is not idempotent. Mitigate with a client-generated
   idempotency key the server uses to deduplicate retries.*
3. Which status code should `GET /orders/999999` return when order 999999
   never existed, and which when the caller is not authenticated?
   *Answer: 404 and 401 respectively.*
