---
question: >
  How many stack frames exist at the deepest point when factorial(5) is
  called, where factorial(n) returns 1 for n <= 1 and n * factorial(n-1)
  otherwise? Count the frame for factorial(5) itself.
type: numerical
subject: programming-fundamentals
level: class-12-cs
chapter: functions
topics:
  - functions-and-recursion
examTag: Board exam pattern
difficulty: medium
answer: >
  5 frames: factorial(5), factorial(4), factorial(3), factorial(2), and
  factorial(1).
explanation: >
  Each call pushes one frame before the next begins, so depth grows with
  n: calls 5, 4, 3, 2, and 1 are all live simultaneously, with factorial(1)
  at the top having hit the base case. The count is n (for n >= 1),
  because the chain from n down to 1 contributes one frame each, and
  factorial(1) returns without pushing another. The general lesson:
  recursion depth, and therefore stack memory, is O(n) for linear
  recursion like factorial, which is why a loop is preferred for large n.
---

## The formula

Maximum depth = n frames for factorial(n), one per call from n down to
the base case at 1.
