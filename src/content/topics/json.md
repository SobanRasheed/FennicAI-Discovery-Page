---
title: JSON
description: >
  A topic hub on JSON: syntax rules, data types, parsing, and when to use
  it over other formats, with examples and FAQs.
beginnerExplanation: >
  JSON, JavaScript Object Notation, is a text format for sending structured
  data between programs. A JSON value is one of six things: an object with
  key-value pairs, an array, a string, a number, true or false, or null.
  Keys always use double quotes, and there is no comment syntax. Its
  simplicity is why nearly every API speaks it: any language can parse it
  in a few lines of code.
relatedConcepts:
  - rest-apis
  - http-methods
faqs:
  - question: Is JSON only for JavaScript?
    answer: >
      No. JSON originated as a subset of JavaScript syntax, but it is now a
      language-independent standard, and every major language ships a JSON
      parser.
  - question: Can JSON contain comments?
    answer: >
      No. The specification has no comment syntax. Configuration files that
      need comments use JSON5 or JSONC, but data exchanged over APIs must be
      strict JSON.
  - question: How do dates work in JSON?
    answer: >
      JSON has no date type. Dates travel as strings, conventionally in ISO
      8601 format like 2026-09-04T12:00:00Z, and each end converts to and
      from its native date type.
  - question: What is the difference between JSON and XML?
    answer: >
      JSON is lighter, with no closing tags or namespaces, and maps directly
      onto objects and arrays. XML supports attributes, schemas, and
      validation tooling that matter in some enterprise and document
      contexts. Most new web APIs choose JSON.
---
