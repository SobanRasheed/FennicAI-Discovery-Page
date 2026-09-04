---
question: >
  Write a SQL query that lists each department's name and the number of
  employees earning more than 50000, showing only departments with at
  least three such employees, ordered from most to fewest.
type: long
subject: database-systems
level: bs-computer-science
chapter: sql-basics
topics:
  - sql-basics
examTag: University final
difficulty: medium
answer: >
  SELECT d.dept_name, COUNT(*) AS high_paid FROM employee e JOIN
  department d ON e.dept_id = d.dept_id WHERE e.salary > 50000 GROUP BY
  d.dept_name HAVING COUNT(*) >= 3 ORDER BY high_paid DESC;
explanation: >
  Each clause has a job the question forces. WHERE filters individual rows
  (salary > 50000) before grouping. GROUP BY collapses the survivors into
  departments. HAVING then filters groups on the aggregate, which WHERE
  cannot do because COUNT(*) does not exist before grouping. The explicit
  JOIN with ON avoids the Cartesian product a comma join risks, and every
  selected non-aggregate column (dept_name) appears in GROUP BY. The ORDER
  BY references the aggregate's alias, which is the only sort key the
  question permits.
---

## Where marks are lost

- Putting `COUNT(*) >= 3` in WHERE: syntax error, zero for that part.
- Selecting a column not in GROUP BY, like e.name.
- Omitting the ON condition and producing a Cartesian product, then
  hiding it with DISTINCT.
- Sorting by dept_name instead of headcount.
