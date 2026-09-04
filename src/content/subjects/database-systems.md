---
title: Database Systems
description: >
  Study notes on relational models, SQL, normalization, and transactions,
  with worked examples, definitions, and practice questions.
introduction: >
  Databases is the subject where understanding beats memorization. These
  notes explain the relational model from first principles, walk through SQL
  you will actually write in exams and on the job, and break normalization
  into a step-by-step procedure rather than a list of definitions to recite.
chapters:
  - slug: relational-model
    title: The Relational Model
    description: >
      Tables, keys, and constraints: the vocabulary every later topic builds
      on.
  - slug: sql-basics
    title: SQL Fundamentals
    description: >
      SELECT, JOIN, GROUP BY, and subqueries, with example queries on a
      consistent sample database.
  - slug: normalization
    title: Normalization
    description: >
      Functional dependencies, 1NF through 3NF, and a repeatable procedure
      for decomposing tables.
  - slug: transactions
    title: Transactions and Concurrency
    description: >
      ACID properties, isolation levels, and why concurrent updates corrupt
      data without locks.
exams:
  - Class 12 board exam
  - BS databases course
importantConcepts:
  - Primary keys versus foreign keys
  - Candidate keys and the highest normal form
  - Lossless decomposition
  - ACID and isolation anomalies
faqs:
  - question: Is SQL the same as MySQL?
    answer: >
      SQL is the standard query language. MySQL, PostgreSQL, and SQLite are
      database systems that implement it, each with small extensions. Exam
      answers should use standard SQL; our SQL notes point out where MySQL
      differs from the standard.
  - question: What is the fastest way to solve normalization questions?
    answer: >
      Find the candidate key first, then check each non-prime attribute for
      partial and transitive dependency on it. Our normalization note turns
      this into a five-step checklist with two fully worked examples.
  - question: Do I need to install a database to practice SQL?
    answer: >
      No. Browser-based tools like SQLite online playgrounds run standard
      SQL with no setup, and our resources page lists the ones we recommend.
  - question: Why does normalization matter if my table already works?
    answer: >
      Un-normalized tables duplicate data, which makes updates inconsistent:
      change a value in one row and the copy in another row goes stale.
      Normalization removes that redundancy. The transactions note shows the
      concrete failure cases.
---
