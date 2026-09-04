---
title: The Relational Model
description: >
  A topic hub on the relational model: tables, keys, constraints, and
  integrity, with definitions, FAQs, and practice questions.
beginnerExplanation: >
  A relational database stores data in tables, where each row is one thing
  (a student, an order) and each column is one fact about it (name, price).
  Keys keep the model honest: a primary key uniquely identifies each row in
  its own table, and a foreign key points from a row in one table to a row
  in another. Constraints are the rules the database enforces so bad data
  never gets in, instead of hoping application code catches it.
relatedConcepts:
  - sql-basics
  - crud-operations
faqs:
  - question: Why is it called the relational model?
    answer: >
      Because tables are relations in the mathematical sense: a relation is
      a set of tuples over defined attributes. The name refers to this
      structure, not to relationships between tables, which is a common
      misconception.
  - question: Can a foreign key be NULL?
    answer: >
      In standard SQL, yes, if the column is nullable. A NULL foreign key
      means the relationship is absent. Whether that is allowed is a design
      decision, which is why NOT NULL constraints matter.
  - question: What is a composite key?
    answer: >
      A primary key made of two or more columns whose combination is unique.
  - question: Does the order of rows in a table matter?
    answer: >
      No. A relation is a set of rows, with no defined order. If you need
      an order, say so with ORDER BY, because without it the database may
      return rows in any order.
---
