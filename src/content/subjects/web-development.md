---
title: Web Development
description: >
  Study notes on HTTP, REST APIs, and frontend basics, with definitions,
  request and response examples, and practice questions.
introduction: >
  Web development notes connect the code you write to what actually travels
  over the network. HTTP is the protocol underneath every request your
  browser makes, and REST is the design discipline that keeps APIs
  understandable. These notes use real request and response examples, not
  abstract diagrams.
chapters:
  - slug: http-fundamentals
    title: HTTP Fundamentals
    description: >
      Methods, status codes, headers, and the anatomy of a request and
      response.
  - slug: rest-apis
    title: REST APIs
    description: >
      Resources, endpoints, verbs, and status codes as a design system for
      web services.
  - slug: json-and-data-formats
    title: JSON and Data Formats
    description: >
      JSON syntax, schema basics, and when form-encoded or XML still wins.
exams:
  - BS web development course
importantConcepts:
  - Idempotent versus safe HTTP methods
  - Resource-oriented URL design
  - Stateless communication
  - Status code families
faqs:
  - question: Is REST a protocol or a style?
    answer: >
      REST is an architectural style, not a protocol. HTTP is the protocol
      that most REST APIs are built on. This distinction is a common exam
      question and our REST API note explains it with a comparison table.
  - question: What is the difference between PUT and PATCH?
    answer: >
      PUT replaces the entire resource with the version you send. PATCH
      sends only the changes. PUT is idempotent in the strict sense; PATCH
      can be, depending on how the server applies changes.
  - question: Do I need to know HTML and CSS before REST?
    answer: >
      For consuming APIs, no. For building full web apps, yes. Our REST
      notes use command-line and JSON examples, so you can test API calls
      before writing any frontend code.
  - question: Which status code should an API return for a validation error?
    answer: >
      400 Bad Request for malformed input the client must fix, or 422
      Unprocessable Content when the request is well-formed but semantically
      wrong, like an end date before a start date. Both are client errors,
      so retrying without changes will not help.
---
