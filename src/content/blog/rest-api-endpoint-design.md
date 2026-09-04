---
title: How to Design REST API Endpoints That Scale
seoTitle: How to Design REST API Endpoints That Scale (With Examples)
description: >
  A practical guide to designing REST API endpoints: choosing resources,
  naming URLs, picking methods, and avoiding the design mistakes that break
  clients later.
author: soban-rasheed
publishedDate: 2026-08-18
updatedDate: 2026-08-30
featured: true
popular: true
category: api-design
topics:
  - rest-apis
  - http-methods
  - crud-operations
relatedNotes:
  - rest-api-design
  - http-fundamentals
faqs:
  - question: Should endpoint URLs use singular or plural nouns?
    answer: >
      Plural. /users naturally reads as the collection and /users/42 as one
      item in it, while /user invites ambiguity between one user and the
      set. Plural also keeps sub-collections like /users/42/orders
      consistent.
  - question: Where should the API version go?
    answer: >
      In the URL path, /v1/users, for public APIs. It is visible in logs,
      cacheable by proxies, and easy for clients to migrate deliberately.
      Header-based versioning suits internal APIs with coordinated
      releases.
  - question: How many endpoints should a resource have?
    answer: >
      The CRUD five: list (GET collection), read (GET item), create (POST),
      update (PUT or PATCH), and delete (DELETE). Anything beyond that is
      usually a missing resource or an action misplaced onto an existing
      one.
  - question: Is it too late to fix a badly designed API?
    answer: >
      For existing clients, yes without versioning. That is the practical
      argument for URL versioning from day one: v2 can fix design mistakes
      while v1 keeps working for clients that never upgrade.
references:
  - title: 'Architectural Styles and the Design of Network-based Software Architectures (Fielding, 2000)'
    url: https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
    source: UC Irvine
  - title: Microsoft REST API Guidelines
    url: https://github.com/microsoft/api-guidelines
    source: Microsoft
---

Every long-lived API eventually reveals which early decisions were
reversible and which were not. Sorting logic, field names, and internals
can change freely. URL structure, versioning, and pagination cannot,
because clients hard-code them. This article is about the irreversible
layer: how to choose and name the endpoints the rest of the system builds
on.

## Start With the Nouns, Not the Verbs

The fastest design exercise is listing your domain's nouns. A task
management product yields: users, projects, tasks, comments, attachments.
Each noun becomes a resource, and each resource gets a URL:

```
/projects
/projects/18
/projects/18/tasks
/tasks/741
/tasks/741/comments
```

The mistake to catch early is verb URLs. `/createTask`, `/assignTask`, and
`/deleteTask` are procedure calls dressed as endpoints. They multiply
without bound (every action gets a new URL), hide inside generic tooling
(an HTTP cache cannot know `/createTask` is unsafe), and give up the
uniform interface that makes APIs learnable without documentation.

## Let the Method Do the Verbs

Once a resource exists, HTTP supplies the operations:

| You want to | Send | To |
|---|---|---|
| List all tasks in project 18 | GET | /projects/18/tasks |
| Read task 741 | GET | /tasks/741 |
| Add a task to project 18 | POST | /projects/18/tasks |
| Rename task 741 | PATCH | /tasks/741 |
| Remove task 741 | DELETE | /tasks/741 |

The one design question worth deliberating is PUT versus PATCH. PUT means
"make the resource exactly this", so omitting a field is a deletion. PATCH
means "apply these changes", so omitted fields survive. Choosing PATCH for
updates matches how users actually edit records and avoids the accidental
data loss of a client that reads, modifies, and PUTs back a stale copy.

## Decide Pagination Before You Have Data

An endpoint that returns every row works in development and fails in
production, and retrofitting pagination breaks every existing client. Ship
it from day one:

```
GET /projects/18/tasks?page=2&per_page=50
```

For high-churn collections, numeric pages can skip or duplicate rows
between requests, because rows shift while you page through them. Cursor
pagination pins the position instead:

```
GET /projects/18/tasks?after=741&limit=50
```

The response includes the next cursor, and the client follows it. Since
this shapes the response body, it belongs in the irreversible-decisions
list too.

## Version in the URL, So You Can Fix Mistakes

Every design rule in this article has a legitimate exception, and your
domain will eventually find one. URL versioning is the escape hatch:

```
/v1/tasks/741
/v2/tasks/741
```

The objection, that URLs should identify resources forever and versions
break that purity, is fair. The practical counter is that an API that
cannot evolve is worse than one that violates purity, and clients migrate
one integration at a time, not all at once.

## The Checklist

Before locking in an API's endpoint design:

1. Every URL is a noun, plural, in the domain's own vocabulary.
2. Every operation uses the standard method, not an action in the path.
3. Updates are PATCH unless full replacement is genuinely the semantics.
4. Collections paginate, from the first release, not the first outage.
5. The URL carries the version, so mistakes have a migration path.

For the underlying rules, the [REST API study notes](/notes/rest-api-design/)
cover method semantics and status codes in exam depth, and the
[HTTP fundamentals notes](/notes/http-fundamentals/) explain the protocol
layer underneath. If you are deciding between REST and its alternatives,
the [REST APIs topic hub](/topics/rest-apis/) collects everything on this
site in one place.
