---
title: REST APIs
description: >
  A topic hub for REST APIs: beginner explanation, study notes, articles,
  examples, FAQs, and practice questions on RESTful design.
beginnerExplanation: >
  A REST API is a set of URLs a website exposes so other programs can read
  and change its data. Each URL points to a thing (a user, an order, a
  playlist), and the HTTP method attached to your request says what you want
  to do: GET reads it, POST creates a new one, PUT or PATCH changes it, and
  DELETE removes it. The server answers with a status code and, usually, a
  JSON body. No special API language is needed, just HTTP, which every
  programming language already speaks.
relatedConcepts:
  - http-methods
  - json
  - crud-operations
faqs:
  - question: What does REST stand for?
    answer: >
      Representational State Transfer. It is an architectural style
      described by Roy Fielding in his 2000 dissertation, not a protocol or
      a product. In practice, a REST API exposes resources at URLs and uses
      HTTP methods to operate on them.
  - question: What makes an API RESTful?
    answer: >
      Resource-oriented URLs, correct HTTP method usage, appropriate status
      codes, and stateless requests, meaning the server keeps no memory of
      previous requests. Authentication data travels with each request, not
      in a server-side session.
  - question: Can a REST API return XML instead of JSON?
    answer: >
      Yes. REST does not mandate a format. JSON dominates because it is
      lighter and maps directly onto objects in most languages, but content
      negotiation lets the client ask for XML or other representations.
  - question: Where should I start learning REST as a beginner?
    answer: >
      Start with our HTTP fundamentals note, then the REST API study note,
      then build a small CRUD project against a public API. The practice
      questions on this page test the vocabulary you need before you start
      coding.
---
