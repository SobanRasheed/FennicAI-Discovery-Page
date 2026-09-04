---
question: >
  Given the relation R(student_id, course_id, student_name, course_title,
  grade) with the functional dependencies student_id -> student_name,
  course_id -> course_title, and (student_id, course_id) -> grade, state
  the highest normal form R satisfies and decompose it into 3NF.
type: long
subject: database-systems
level: bs-computer-science
chapter: normalization
topics:
  - relational-model
  - sql-basics
examTag: University final
difficulty: medium
answer: >
  R is in 1NF (assuming atomic values) but violates 2NF, because
  student_name and course_title are non-prime attributes that depend on
  proper subsets of the composite candidate key (student_id, course_id).
  3NF decomposition: student(student_id, student_name),
  course(course_id, course_title), and
  enrollment(student_id, course_id, grade).
explanation: >
  The candidate key is (student_id, course_id), the minimal set whose
  closure covers all attributes, making student_id and course_id the prime
  attributes. student_name depends on student_id alone and course_title on
  course_id alone, so both are partial dependencies, which rules out 2NF.
  The decomposition moves each partially dependent attribute into its own
  table with the part of the key it actually depends on. grade stays with
  the full key in the enrollment table, so every table is in 3NF with no
  transitive dependencies. The decomposition is lossless: each pair of
  tables shares the attribute that functionally determines the rest of
  one side.
---

## Marking-scheme structure

A full-mark answer has four parts:

1. **Candidate key** named with justification (closure covers all
   attributes).
2. **Violation identified** as 2NF partial dependencies, with each
   dependent attribute tied to the key subset it depends on.
3. **Decomposition** into the three tables.
4. **Losslessness check**: rejoining on student_id and course_id
   reconstructs the original relation exactly.

The worked example in the [normalization notes](/notes/normalization/)
runs this exact pattern end to end.
