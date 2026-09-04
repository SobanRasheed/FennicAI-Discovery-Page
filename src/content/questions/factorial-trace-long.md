---
question: >
  Trace the execution of the recursive function factorial(3) where
  factorial(n) returns 1 when n is less than or equal to 1, and
  n * factorial(n - 1) otherwise. Show each stack frame and the final
  result.
type: long
subject: programming-fundamentals
level: class-12-cs
chapter: functions
topics:
  - functions-and-recursion
examTag: Board exam pattern
difficulty: medium
answer: >
  factorial(3) = 3 * factorial(2) = 3 * (2 * factorial(1)) = 3 * (2 * 1)
  = 6. The final result is 6. Stack: factorial(3) waits on factorial(2),
  which waits on factorial(1); factorial(1) hits the base case and
  returns 1, then each frame multiplies and unwinds: factorial(2) returns
  2, factorial(3) returns 6.
explanation: >
  The trace has two phases. Winding: each call pushes a frame and cannot
  complete until the smaller call returns, so factorial(3), factorial(2),
  factorial(1) stack up, three frames deep. Unwinding: factorial(1)
  satisfies the base case (n <= 1) and returns 1 immediately, which lets
  factorial(2) compute 2 * 1 = 2, which lets factorial(3) compute 3 * 2 =
  6. The base case is what terminates the chain; without it every call
  pushes another frame until the stack is exhausted.
---

## How to lay out the trace in an exam

Write one line per frame, outward then back:

```
factorial(3) -> 3 * factorial(2)
factorial(2) -> 2 * factorial(1)
factorial(1) -> 1            (base case)
factorial(2) -> 2 * 1 = 2    (unwinds)
factorial(3) -> 3 * 2 = 6    (unwinds)
```

Markers look for the base case being identified and the unwinding order
being correct, not just the final 6. The [functions in C notes](/notes/functions-in-c/)
cover the call stack mechanics.
