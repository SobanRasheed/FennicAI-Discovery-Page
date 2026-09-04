---
title: SQL Basics
description: >
  A topic hub on SQL basics: SELECT, JOIN, GROUP BY, and subqueries, with
  example queries, FAQs, and practice questions.
beginnerExplanation: >
  SQL is the language you use to ask a relational database questions. A
  query names the table you want data from (FROM), which rows you care
  about (WHERE), which columns to return (SELECT), and how to group or
  sort the result (GROUP BY, ORDER BY). Joins pull together rows from
  related tables by matching their keys. You can read almost any SQL query
  bottom-up: start at FROM to see what tables are involved, then apply
  WHERE, then the SELECT list.
relatedConcepts:
  - crud-operations
  - relational-model
faqs:
  - question: What is the order SQL clauses run in?
    answer: >
      Logically: FROM, then WHERE, then GROUP BY, then HAVING, then SELECT,
      then ORDER BY. This explains why you cannot use a column alias inside
      WHERE: the alias does not exist yet when WHERE is evaluated.
  - question: What is the difference between WHERE and HAVING?
    answer: >
      WHERE filters individual rows before grouping. HAVING filters groups
      after GROUP BY has formed them. If you are filtering on an aggregate
      like COUNT, you must use HAVING.
  - question: Which JOIN should I use by default?
    answer: >
      INNER JOIN, and switch to LEFT JOIN only when you need rows from the
      left table that have no match. FULL and CROSS joins exist but are rare
      in exam answers and production queries alike.
  - question: Why does SELECT * get marks deducted?
    answer: >
      It returns columns you did not ask for, breaks when the schema
      changes, and prevents index covering. Exams and code reviews both
      expect explicit column lists.
---
