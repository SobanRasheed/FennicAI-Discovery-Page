---
title: HTTP Methods and Status Codes
description: >
  A topic hub on HTTP methods and status codes: what each verb and code
  family means, with examples, FAQs, and practice questions.
beginnerExplanation: >
  Every request you make to a web server has two parts you control: the
  method, which is the verb, and the URL, which is the thing the verb acts
  on. GET asks to read, POST asks to create, PUT replaces, PATCH partially
  updates, and DELETE removes. The server replies with a three-digit status
  code: 2xx means success, 3xx means go somewhere else, 4xx means you made a
  mistake, and 5xx means the server made one. Learning this vocabulary turns
  API debugging from guesswork into reading.
relatedConcepts:
  - rest-apis
  - json
faqs:
  - question: Why is GET called a safe method?
    answer: >
      Safe means the request does not change server data, not that it cannot
      fail. A GET can return an error or trigger logging, but calling it
      repeatedly leaves the resource in the same state.
  - question: What is the difference between idempotent and safe?
    answer: >
      Idempotent means repeating the request has the same effect as making
      it once. DELETE is idempotent (deleting the same resource twice leaves
      it deleted) but not safe, because it changes data. GET is both, POST
      is neither.
  - question: Should a failed DELETE return 404 or 200?
    answer: >
      If the resource does not exist, 404 Not Found is the honest answer.
      Some APIs return 204 even for missing resources to make DELETE
      idempotent from the client's perspective, but that hides information
      and is debated in our REST API article.
  - question: What is the difference between 301 and 302?
    answer: >
      Both redirect, but 301 is permanent and 302 is temporary. Search
      engines replace the old URL with the new one for 301 and keep the old
      one indexed for 302.
---
