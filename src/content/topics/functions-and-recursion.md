---
title: Functions and Recursion in C
description: >
  How C functions work: prototypes, definitions, calls, pass by value,
  scope, and recursion, collected in one place with notes and practice
  questions.
beginnerExplanation: >
  A function is a named block of code you can run from anywhere in your
  program. You declare it with a prototype so the compiler knows its
  shape, define its body once, and call it as many times as you like.
  C always copies the values you pass in, so a function cannot change the
  caller's variables unless you pass an address. Recursion is when a
  function calls itself with a smaller input, and it must have a base
  case that stops the chain, or the program runs out of stack memory.
relatedConcepts:
  - sql-basics
faqs:
  - question: What is the difference between a function prototype and a definition?
    answer: >
      The prototype is a declaration, ending in a semicolon, that tells
      the compiler the function's name, return type, and parameter types
      so calls can be checked before the body exists. The definition
      includes the body in braces.
  - question: Why can't a C function change its caller's variables?
    answer: >
      Because arguments are passed by value: the caller's value is copied
      into the parameter, and the function modifies only the copy. Pass a
      pointer (the variable's address) if the function must write back to
      the caller.
  - question: What happens if a recursive function never reaches its base case?
    answer: >
      Each call pushes a new stack frame, so the chain grows until stack
      memory is exhausted and the program crashes with a stack overflow.
  - question: Is recursion or iteration better?
    answer: >
      Iteration is generally cheaper: one loop, one frame. Recursion suits
      self-similar problems like trees and factorial-style definitions,
      and is often clearer there, but costs a frame per call.
---
