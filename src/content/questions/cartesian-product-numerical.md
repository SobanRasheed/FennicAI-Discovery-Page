---
question: >
  A relation has 40 rows after a join and the join condition was ON
  e.dept_id = d.dept_id. Before the join, employee had 20 rows and
  department had 4 rows. What is the maximum number of rows the join could
  produce if the ON condition were removed, and what is that result
  called?
type: numerical
subject: database-systems
level: bs-computer-science
chapter: relational-model
topics:
  - relational-model
examTag: University midterm
difficulty: easy
answer: >
  20 x 4 = 80 rows, called a Cartesian product (cross join). Every one of
  the 20 employees is paired with every one of the 4 departments.
explanation: >
  Without a join condition, the join degenerates to the Cartesian product
  of the two tables, whose row count is the product of the input row
  counts: 20 * 4 = 80. The ON condition e.dept_id = d.dept_id restricts
  the result to matching pairs only, which is why the real join produced
  40 rows (each employee matched roughly two departments in this data).
  This question is arithmetic, but the follow-up marker cares about is
  the principle: every missing ON condition multiplies rows silently
  rather than erroring, so row counts are the debugging signal.
---

## The formula

Cartesian product rows = |R| x |S|, the product of the row counts.
A join with condition is that product filtered by the condition.
