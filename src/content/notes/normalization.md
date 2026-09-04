---
title: Normalization: Complete Study Notes
seoTitle: Database Normalization Notes: 1NF, 2NF, 3NF with Worked Examples
description: >
  Complete database normalization notes covering functional dependencies,
  1NF, 2NF, and 3NF, with a five-step decomposition procedure and two
  fully worked examples.
overview: >
  These notes explain normalization as a procedure, not a vocabulary list:
  find the candidate key, detect partial and transitive dependencies, and
  decompose until every table is in 3NF, with two worked examples.
subject: database-systems
level: bs-computer-science
chapter: normalization
topics:
  - relational-model
  - sql-basics
learningObjectives:
  - Define functional dependency and candidate key
  - Test a relation for 1NF, 2NF, and 3NF violations
  - Decompose a relation into 3NF using a repeatable procedure
  - Explain what anomalies un-normalized designs suffer from
  - State when denormalization is a justified trade-off
keyTerms:
  - term: Functional dependency
    definition: >
      An attribute B is functionally dependent on A when every distinct A
      value determines exactly one B value, written A -> B.
  - term: Candidate key
    definition: >
      A minimal set of attributes that uniquely identifies each row. One
      candidate key is chosen as the primary key.
  - term: Prime attribute
    definition: >
      An attribute that belongs to some candidate key. Non-prime attributes
      belong to none.
  - term: Partial dependency
    definition: >
      A non-prime attribute depending on part of a composite candidate key.
      The 2NF violation.
  - term: Transitive dependency
    definition: >
      A non-prime attribute depending on another non-prime attribute. The
      3NF violation.
importantPoints:
  - Always find the candidate key before judging normal forms.
  - 1NF: atomic values, no repeating groups.
  - 2NF: no partial dependency on a composite key.
  - 3NF: no transitive dependency, "the key, the whole key, and nothing
    but the key."
  - Every decomposition must be lossless: rejoining must reconstruct the
    original data.
formulas:
  - expression: '3NF test: for every non-trivial FD X -> A, X is a superkey OR A is prime'
    meaning: >
      The formal 3NF condition used to test any candidate decomposition. If
      any dependency fails both clauses, the relation is not in 3NF.
  - expression: 'Lossless join test: R1 intersect R2 -> R1 or R2'
    meaning: >
      A binary decomposition is lossless when the shared attributes
      functionally determine all of one side.
summary: >
  Normalization removes redundancy by decomposing tables until every
  non-key attribute depends on the key, the whole key, and nothing but the
  key. The procedure is: compute the candidate key, eliminate repeating
  groups (1NF), remove partial dependencies (2NF), remove transitive
  dependencies (3NF), verifying at each step that the decomposition is
  lossless.
faqs:
  - question: What is the "key, whole key, nothing but the key" mnemonic?
    answer: >
      Each row is identified by the key (1NF), every non-key attribute
      depends on the whole key (2NF), and on nothing but the key (3NF). It
      summarizes the first three normal forms in one sentence, and makes a
      strong closing line for an exam answer.
  - question: What normal form should I stop at?
    answer: >
      3NF for most courses and applications. BCNF is a stricter form that
      handles rare edge cases where a non-superkey determines a prime
      attribute. Always stop when the anomalies are gone: normalizing
      further adds join cost with no benefit.
  - question: What are the three anomalies normalization removes?
    answer: >
      Insert (cannot record a fact because its owner row does not exist
      yet), update (must change the same fact in many rows), and delete
      (removing one row destroys an unrelated fact).
  - question: Why would anyone denormalize on purpose?
    answer: >
      Read-heavy reporting. Joins across fully normalized tables cost time
      per query, so a data warehouse may store one wide table. The trade is
      redundancy that update anomalies can corrupt, which is acceptable
      when data is loaded in batches rather than edited row by row.
references:
  - title: 'Database System Concepts (Silberschatz, Korth, Sudarshan), chapter on relational design'
    source: McGraw-Hill
  - title: An Introduction to Database Systems (C. J. Date)
    source: Pearson
author: mahnoor-tariq
publishedDate: 2026-06-20
updatedDate: 2026-09-01
popular: true
---

## Introduction

Normalization questions are consistent point-losers because students
memorize the form definitions but never practice the procedure. These notes
invert that: the definitions take one page, and the rest is two worked
examples done the way you should do them in an exam, candidate key first.

## Why Normalize

Take this un-normalized table of student course enrollments:

| student_id | student_name | dept_name | dept_hod | course_id | course_title |
|---|---|---|---|---|---|
| 1 | Ayesha | CS | Dr. Karim | CS101 | Programming |
| 2 | Bilal | CS | Dr. Karim | CS101 | Programming |
| 3 | Sana | EE | Dr. Farah | EE201 | Circuits |

Three anomalies live in this one table:

- **Update anomaly:** Dr. Karim becomes HOD of a new department, and you
  must update two rows. Miss one and the data contradicts itself.
- **Insert anomaly:** a new department with no students cannot be recorded,
  because student_id would be NULL and rows need an identity.
- **Delete anomaly:** if Sana drops EE201 and she was the only EE student,
  deleting her row erases the fact that Dr. Farah heads EE.

Normalization splits this into `student`, `department`, `course`, and
`enrollment` tables so each fact lives in exactly one place.

## First Normal Form: Atomicity

A relation is in 1NF when every attribute holds a single atomic value and
there are no repeating groups. The classic violation is a phone_numbers
column containing "1234, 5678" or a table with phone1, phone2, phone3
columns. Fix: one row per phone number in a separate table keyed by
student_id.

## Functional Dependencies and the Candidate Key

A functional dependency `X -> Y` means every X value maps to exactly one Y
value. Given the dependency set, compute the **candidate key** by finding
the minimal attribute set that determines all others. Everything after this
step is mechanical testing against the key, which is why students who skip
it get lost.

## Second Normal Form: The Whole Key

A relation is in 2NF when it is in 1NF and no non-prime attribute depends on
a *proper subset* of a candidate key. This can only bite when the candidate
key is composite.

### Worked example

`enrollment(student_id, course_id, student_name, course_title, grade)`
with key (student_id, course_id):

- `student_name` depends on `student_id` alone: partial dependency, 2NF
  violation.
- `course_title` depends on `course_id` alone: partial dependency.
- `grade` depends on the full key: correct.

Decompose, moving each partially-dependent attribute into a table with the
part of the key it actually depends on:

- `student(student_id, student_name)`
- `course(course_id, course_title)`
- `enrollment(student_id, course_id, grade)`

## Third Normal Form: Nothing but the Key

A relation is in 3NF when it is in 2NF and no non-prime attribute depends
transitively on the key, that is, on another non-prime attribute.

### Worked example

`student(student_id, student_name, dept_name, dept_hod)`:

- `student_id -> dept_name` and `dept_name -> dept_hod`, so `dept_hod`
  depends on the key only through `dept_name`: transitive dependency, 3NF
  violation.

Decompose:

- `department(dept_name, dept_hod)`
- `student(student_id, student_name, dept_name)`

The shared attribute `dept_name` in both tables is what makes the join
lossless: it functionally determines `dept_hod`, satisfying the lossless
join test from the formulas section.

## The Five-Step Procedure

1. List the given functional dependencies.
2. Compute the candidate key: the minimal set whose closure covers all
   attributes.
3. 1NF check: atomic values, no repeating groups. Fix by extraction.
4. 2NF check: for every non-prime attribute, does it depend on part of a
   composite key? Fix by decomposition.
5. 3NF check: for every remaining dependency, does the determinant fail the
   superkey-or-prime test? Fix by decomposition.

Run the two worked examples above through these five steps and you will
recognize the pattern in any exam variant, including the trick where the
candidate key turns out to be a single column (then 2NF is automatic).

## Practice Scenarios

1. `supplier(supplier_id, city, city_population)` with key supplier_id.
   Which form is violated and what is the decomposition?
   *Answer: 3NF. city -> city_population is transitive. Split into
   supplier(supplier_id, city) and city(city, city_population).*
2. `inventory(warehouse_id, item_id, warehouse_city, quantity)` with key
   (warehouse_id, item_id). Diagnose and decompose.
   *Answer: 2NF violation, warehouse_city depends on warehouse_id alone.
   Split into warehouse(warehouse_id, warehouse_city) and
   inventory(warehouse_id, item_id, quantity).*
