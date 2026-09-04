---
question: >
  What does the following C program print, and why?
  void doubleIt(int n) { n = n * 2; } with main calling doubleIt(v) where
  v is 5, then printing v.
type: short
subject: programming-fundamentals
level: class-12-cs
chapter: functions
topics:
  - functions-and-recursion
examTag: Board exam pattern
difficulty: easy
answer: 'It prints 5, not 10.'
explanation: >
  C passes arguments by value: the call copies v's value into the
  parameter n, and doubleIt modifies only the copy. When the function
  returns, its frame, including n, is gone, and v in main is untouched.
  To actually double v, pass its address, void doubleIt(int *n) { *n =
  *n * 2; }, and call doubleIt(&v), so the function writes through
  the pointer to the caller's variable.
---

## One-line version for short-answer papers

doubleIt receives a copy of v, changes the copy, and the original v is
unchanged, so the program prints 5.
