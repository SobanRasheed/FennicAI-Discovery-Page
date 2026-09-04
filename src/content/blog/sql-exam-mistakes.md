---
title: The SQL Mistakes That Cost Marks in Exams
description: >
  Seven common SQL exam mistakes, from forgetting DISTINCT to misusing
  GROUP BY, each shown as the wrong answer students write and the
  correction examiners expect.
author: mahnoor-tariq
publishedDate: 2026-06-05
updatedDate: 2026-09-01
featured: false
popular: false
category: databases
topics:
  - sql-basics
  - relational-model
relatedNotes:
  - normalization
faqs:
  - question: Why does my GROUP BY query fail when it runs fine without grouping?
    answer: >
      Because once you group, every selected column must be either inside
      an aggregate function or listed in GROUP BY. Selecting a bare column
      alongside COUNT(*) is the classic failure, and the fix is to either
      add the column to GROUP BY or remove it from SELECT.
  - question: Is WHERE or HAVING the right place to filter aggregated results?
    answer: >
      HAVING. WHERE filters rows before grouping, HAVING filters groups
      after aggregation. Filtering on an aggregate like COUNT(*) can only
      happen in HAVING, because the count does not exist until grouping is
      done.
  - question: Do I lose marks for writing JOIN instead of INNER JOIN?
    answer: >
      Usually not, they are synonymous. You lose marks for join conditions
      that are wrong, joining on the wrong column pair, or Cartesian
      products from a missing join condition.
references:
  - title: SQL Standard ISO/IEC 9075
    source: ISO
  - title: 'Database System Concepts (Silberschatz, Korth, Sudarshan), SQL chapters'
    source: McGraw-Hill
---

SQL exams reward precision. The queries are short, the syntax is exact,
and examiners see the same handful of mistakes year after year. Each one
below shows the wrong answer students actually write, why it is wrong, and
the correction, in the order they usually appear on a paper.

## 1. Selecting a Bare Column With GROUP BY

```sql
-- written
SELECT dept, COUNT(*) FROM employee GROUP BY dept_id;
```

The column selected is `dept` but grouping is on `dept_id`. In strict SQL
every selected non-aggregate column must appear in GROUP BY. If they are
the same column under two names, pick one and use it in both places.

## 2. Filtering Aggregates in WHERE

```sql
-- written
SELECT dept_id, COUNT(*) FROM employee
WHERE COUNT(*) > 5
GROUP BY dept_id;
```

`COUNT(*)` does not exist when WHERE runs, so this is a syntax error, not
just a wrong answer. Move the condition:

```sql
SELECT dept_id, COUNT(*) FROM employee
GROUP BY dept_id
HAVING COUNT(*) > 5;
```

## 3. The Silent Cartesian Product

```sql
-- written
SELECT e.name, d.dept_name
FROM employee e, department d;
```

The comma join with no join condition matches every employee to every
department. Row counts multiply, and the marker spots it instantly.
Modern syntax makes the omission impossible to hide:

```sql
SELECT e.name, d.dept_name
FROM employee e
JOIN department d ON e.dept_id = d.dept_id;
```

## 4. Forgetting NULL Is Not a Value

`WHERE salary != 50000` silently excludes rows where salary is NULL,
because NULL comparisons are unknown, not true. If the question asks for
"everyone not earning exactly 50000", the expected answer includes them:

```sql
WHERE salary != 50000 OR salary IS NULL;
```

## 5. DISTINCT as an Afterthought

When a join multiplies rows, students bolt DISTINCT onto the query to
collapse the duplicates. That hides the real problem, a join condition
that is too loose. DISTINCT is correct when the question genuinely asks
for unique values, not as a deduplicator for a sloppy join.

## 6. ORDER BY on the Wrong Column After Aggregation

Sorting by a column that is neither grouped nor aggregated is the same
class of error as selecting one. When a question asks for "each
department's headcount, largest first", the sort key is the aggregate:

```sql
SELECT dept_id, COUNT(*) AS headcount
FROM employee
GROUP BY dept_id
ORDER BY headcount DESC;
```

## 7. INSERT Without Column Names

```sql
INSERT INTO employee VALUES (1, 'Ayesha', 'CS');
```

This compiles only if the value order happens to match the table's column
order exactly, which examiners love to shuffle. Naming the columns makes
the answer robust and costs two words:

```sql
INSERT INTO employee (id, name, dept_id) VALUES (1, 'Ayesha', 'CS');
```

## How to Self-Check a Query

Before writing any SQL in an exam, run this checklist:

1. Every non-aggregate SELECT column is in GROUP BY.
2. Aggregate conditions live in HAVING, row conditions in WHERE.
3. Every join has an explicit ON condition.
4. NULL handling is considered wherever a filter mentions a nullable
   column.
5. INSERT and UPDATE name their target columns.

The underlying data model these queries operate on, keys, dependencies,
and why the tables are shaped that way, is covered in the [normalization
study notes](/notes/normalization/), and the [SQL basics topic hub](/topics/sql-basics/)
collects the practice sets. Use both: examiners increasingly write
questions that cross the design/query boundary, asking you to decompose a
table and then query the result.
