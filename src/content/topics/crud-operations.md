---
title: CRUD Operations
description: >
  A topic hub on CRUD: how create, read, update, and delete map onto HTTP
  methods, SQL, and application design.
beginnerExplanation: >
  CRUD is the vocabulary for the four things any data application does:
  create a record, read it, update it, and delete it. The same four verbs
  appear at every layer of the stack, SQL INSERT, SELECT, UPDATE, and
  DELETE, and HTTP POST, GET, PUT or PATCH, and DELETE, which is why
  learning CRUD once pays off across databases, APIs, and frontend code.
relatedConcepts:
  - rest-apis
  - sql-basics
faqs:
  - question: What does CRUD stand for?
    answer: >
      Create, Read, Update, Delete. It describes the complete set of data
      operations most applications need, and maps one-to-one onto both SQL
      statements and HTTP methods.
  - question: Is CRUD the same as REST?
    answer: >
      No, but they align. CRUD describes data operations. REST is an
      architectural style whose resource and method conventions happen to
      express CRUD naturally: POST creates, GET reads, PUT or PATCH updates,
      DELETE deletes.
  - question: Why do interviewers ask about CRUD?
    answer: >
      A CRUD app touches every layer: database schema, server routes,
      validation, and frontend forms. Building one end to end demonstrates
      you can wire the layers together, which is why it is the standard
      first technical screen.
---
