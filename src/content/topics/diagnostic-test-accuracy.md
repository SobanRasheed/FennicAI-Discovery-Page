---
title: Diagnostic Test Accuracy
description: >
  Sensitivity, specificity, PPV and NPV explained with 2x2 tables: which
  tests screen, which confirm, and why prevalence changes everything.
beginnerExplanation: >
  Imagine a net for catching fish. A net with a very fine mesh catches
  every fish, including the tiniest ones, but it also snags boots and
  weeds. That is a sensitive test: it rarely misses anyone who has the
  disease, but it raises false alarms. A net with a special design that
  only catches one exact species of fish is a specific test: if it traps
  something, you can be confident it is the right fish, but some real
  fish may slip past.

  The confusing part is that the same net behaves differently in
  different ponds. Fishing in a pond teeming with the target fish means
  most of your catches are genuine. Fishing in a nearly empty pond means
  most catches are boots, even with the same net. That is prevalence
  changing the positive predictive value, and it is the single most
  examined idea in this topic.
relatedConcepts:
  - antimicrobial-resistance
  - acid-base-balance
faqs:
  - question: What is the difference between sensitivity and PPV?
    answer: >
      Sensitivity is the proportion of diseased people the test detects,
      so it is calculated among people who have the disease and does not
      change with prevalence. PPV is the proportion of positive results
      that are true positives, calculated among people who tested
      positive, and it rises and falls with prevalence.
  - question: Why do screening tests need high sensitivity?
    answer: >
      Screening is applied to large, mostly healthy populations, so the
      priority is not missing true cases. A sensitive test keeps false
      negatives low, and any positives are then sorted out by a more
      specific confirmatory test.
  - question: How do I memorize the 2x2 table formulas?
    answer: >
      Write the 2x2 table with disease on top and test result on the
      side. Sensitivity is true positives over all diseased, the whole
      disease column. Specificity is true negatives over all healthy,
      the whole non-disease column. PPV and NPV read along the rows of
      test positives and test negatives instead.
  - question: What are the standard screening thresholds used in practice?
    answer: >
      Screening programs accept high sensitivity even at some cost to
      specificity, then confirm. Confirmation is the reverse, high
      specificity, because a false positive label exposes a person to
      invasive follow-up, cost, and anxiety.
---

## What it is

Diagnostic test accuracy measures how well a test reflects true disease
status, judged against a gold standard in a 2x2 table. Sensitivity, a
divided by a plus c, is the share of diseased people who test positive.
Specificity, d divided by b plus d, is the share of healthy people who
test negative. Positive predictive value, a over a plus b, is the chance
that a positive result is real. Negative predictive value, d over c plus
d, is the chance that a negative result is clean. The critical asymmetry
is that sensitivity and specificity belong to the test, while PPV and
NPV depend on how common the disease is in the population being tested.
This is why tests screen with high sensitivity, then confirm with high
specificity, and why the same test can look excellent in a hospital ward
and misleading in a community survey.

## Why it spans subjects

In community medicine, screening evaluation is a core
[epidemiology](/subjects/community-medicine/) topic, and PPV moves
directly with disease frequency, the idea unpacked in the
[incidence versus prevalence note](/notes/incidence-vs-prevalence/). In
biochemistry, reference ranges and diagnostic enzymes, troponin, CK-MB,
amylase, are tests whose cutoffs trade sensitivity against specificity,
as covered across [biochemistry](/subjects/biochemistry/). In pathology,
histopathology and cytology reports, and their false positive and false
negative rates, decide patient management, building on the disease
processes in the [cell injury note](/notes/cell-injury/). The same logic
governs lab reporting in
[antimicrobial resistance](/topics/antimicrobial-resistance/) and the
interpretation of blood gases discussed under
[acid-base balance](/topics/acid-base-balance/).

## Where it's examined

Third Professional MBBS examines this heavily in community medicine,
epidemiology and biostatistics, usually as calculation questions built on
a 2x2 table, and it appears across every subject that interprets a lab
report. Numerical fluency is everything here: drill the
[community medicine quiz](/practice/quiz/community-medicine/) until the
formulas are automatic.
