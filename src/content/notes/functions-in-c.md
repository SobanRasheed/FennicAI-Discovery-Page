---
title: Functions in C: Complete Study Notes
seoTitle: Functions in C Notes: Parameters, Return Values, and Recursion
description: >
  Complete study notes on functions in C covering definition syntax,
  parameters, return values, scope, and recursion, with examples and board
  exam practice.
overview: >
  These notes explain how functions work in C: declaring, defining, and
  calling them, how arguments pass by value, what scope rules govern
  variables, and how recursion replaces loops, with board-pattern examples.
subject: programming-fundamentals
level: class-12-cs
chapter: functions
topics:
  - functions-and-recursion
learningObjectives:
  - Write a function definition with correct syntax
  - Explain pass by value and its consequences
  - Trace variable scope inside and outside functions
  - Convert a simple loop into a recursive function
keyTerms:
  - term: Function prototype
    definition: >
      A declaration that tells the compiler a function's name, return type,
      and parameter types before its definition appears.
  - term: Parameter
    definition: >
      The variable named in the function definition that receives a value.
  - term: Argument
    definition: >
      The actual value passed to a function when it is called.
  - term: Recursion
    definition: >
      A function calling itself, with a base case that stops the chain.
importantPoints:
  - C passes arguments by value: the function gets a copy.
  - A function can return at most one value.
  - Variables declared inside a function vanish when it returns.
  - Every recursive function needs a base case or it never stops.
formulas:
  - expression: 'returnType functionName(parameterList) { body }'
    meaning: The syntax of a function definition in C.
  - expression: 'factorial(n) = n x factorial(n - 1), factorial(0) = 1'
    meaning: The classic recursive definition used in board exams.
summary: >
  A function packages a computation behind a name: you declare it with a
  prototype, define it with a return type and parameters, and call it with
  arguments. C passes arguments by value, so functions operate on copies
  and communicate results through the return value or pointers. Recursion
  replaces loops for self-similar problems and requires a base case.
faqs:
  - question: Why does my function's change to a variable not stick?
    answer: >
      Because C copies the argument into the parameter. Changing the copy
      leaves the original untouched. Pass a pointer if the function must
      modify the caller's variable.
  - question: What happens if a recursive function has no base case?
    answer: >
      It calls itself forever until the call stack is exhausted and the
      program crashes with a stack overflow. Always identify the base case
      before writing the recursive case.
  - question: Can a function return two values in C?
    answer: >
      Not directly. It can return a struct, or write results through
      pointer parameters, which is how exam questions usually phrase it.
  - question: Is recursion always better than a loop?
    answer: >
      No. Recursion suits self-similar structures like trees and factorial
      style definitions, but it costs a stack frame per call. A loop is
      simpler and faster for linear iteration like summing an array.
references:
  - title: 'The C Programming Language (Kernighan and Ritchie), chapter 4'
    source: Prentice Hall
author: bilal-ahmed
publishedDate: 2026-05-10
updatedDate: 2026-08-20
popular: true
---

## Introduction

Functions are the first abstraction programmers learn: give a computation a
name, feed it inputs, get an output back, and reuse it everywhere. In C the
rules are strict and visible, which makes them perfect exam material. These
notes cover the full lifecycle: prototype, definition, call, and what
happens in memory while it runs.

## Anatomy of a Function

```c
#include <stdio.h>

/* prototype: tells the compiler what is coming */
int add(int a, int b);

/* definition: the actual body */
int add(int a, int b) {
    return a + b;
}

int main(void) {
    int sum = add(3, 4);   /* call: arguments 3 and 4 */
    printf("%d\n", sum);   /* prints 7 */
    return 0;
}
```

Three pieces, three purposes: the **prototype** lets the compiler check
every call before the definition exists, the **definition** is the body,
and the **call** copies the arguments into the parameters and jumps into
the body.

## Pass by Value

C always copies arguments. This function does nothing useful, and
understanding why is worth ten marks:

```c
void tryToChange(int x) {
    x = 99;   /* changes the copy, not the caller's variable */
}
```

To affect the caller's variable, pass its address:

```c
void actuallyChange(int *x) {
    *x = 99;  /* writes through the pointer to the real variable */
}
```

## Scope and Lifetime

Variables declared inside a function are **local**: they exist only while
that call runs. Two functions can each have a variable named `count`
without conflict, because each lives in its own frame. Variables declared
outside all functions are **global**, visible everywhere, and generally
avoided because any function can silently modify them.

## Recursion

A recursive function solves a problem by solving a smaller copy of the same
problem:

```c
int factorial(int n) {
    if (n <= 1) return 1;          /* base case */
    return n * factorial(n - 1);   /* recursive case */
}
```

Tracing `factorial(4)` is the standard exam question: the calls stack up
as 4 x f(3) x f(2) x f(1), the base case returns 1, and the results
unwind to 24. Every recursive answer must name its base case, or the trace
never ends.

## Practice Scenarios

1. Write a function `maximum` that takes two integers and returns the
   larger. *Answer: `int maximum(int a, int b) { return a > b ? a : b; }`*
2. Why does this code print 5, not 10?

   ```c
   void doubleIt(int n) { n = n * 2; }
   int main(void) { int v = 5; doubleIt(v); printf("%d", v); }
   ```

   *Answer: pass by value. `doubleIt` modifies its copy of v.*
3. Trace `factorial(3)` showing each stack frame.
   *Answer: f(3)=3 x f(2), f(2)=2 x f(1), f(1)=1, unwinding to 6.*
