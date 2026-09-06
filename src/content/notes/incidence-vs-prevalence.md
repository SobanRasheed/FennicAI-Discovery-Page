---
title: 'Incidence vs Prevalence: Complete Study Notes'
seoTitle: 'Incidence vs Prevalence: Definitions, Relationship, Study Designs, Worked Examples'
description: >
  Epidemiology notes on incidence versus prevalence: definitions, the
  bathwater analogy, prevalence equals incidence times duration, study
  designs, and worked numeric examples.
overview: >
  These notes define incidence and prevalence, connect them through the
  bathwater analogy and the relationship prevalence approximates incidence
  times duration, show which study designs measure each, and work through
  numeric examples — including how prevalence moves predictive values.
subject: community-medicine
level: third-professional-mbbs
chapter: epidemiology
topics:
  - diagnostic-test-accuracy
learningObjectives:
  - Define incidence and prevalence precisely, including point and period prevalence
  - Explain the relationship prevalence approximates incidence times average duration
  - Identify which study designs measure incidence and which measure prevalence
  - Calculate incidence and prevalence from population data
  - Distinguish the uses of each measure in describing disease burden and risk
  - Explain how prevalence changes the predictive value of a diagnostic test
keyTerms:
  - term: Incidence
    definition: >
      The number of new cases arising in a defined population at risk during
      a specified time period.
  - term: Prevalence
    definition: >
      The proportion of a population that has the disease at a given point
      in time (point prevalence) or during a period (period prevalence).
  - term: Population at risk
    definition: >
      The people who could become cases — those without the disease and not
      immune; the correct denominator for incidence.
  - term: Period prevalence
    definition: >
      All cases existing at the start of a period plus new cases arising
      during it, divided by the population.
  - term: Duration of disease
    definition: >
      Average time from onset to recovery or death; with incidence, it sets
      the prevalence of a chronic disease.
  - term: Cross-sectional study
    definition: >
      A study measuring exposure and disease at one point in time; it
      estimates prevalence, not incidence.
  - term: Cohort study
    definition: >
      A study following exposed and unexposed people forward in time; it
      measures incidence directly.
  - term: Positive predictive value
    definition: >
      The proportion of people testing positive who truly have the disease —
      it rises and falls with prevalence.
importantPoints:
  - Incidence counts new cases; prevalence counts all existing cases.
  - Incidence measures risk and causes; prevalence measures burden and
    chronic disease load.
  - Prevalence approximates incidence multiplied by average duration in a
    steady state.
  - Diseases of long duration accumulate high prevalence even at low
    incidence; diseases of short duration or high fatality stay low.
  - Cross-sectional surveys and screening data measure prevalence; cohort
    studies, trials and surveillance measure incidence.
  - The incidence denominator excludes existing cases; the prevalence
    denominator is the total population.
  - Positive predictive value rises with prevalence even when sensitivity and
    specificity stay constant — the base-rate effect.
formulas:
  - expression: 'Incidence rate = (New cases during period ÷ Population at risk) × multiplier'
    meaning: >
      New cases per population at risk over a defined period, reported per
      1,000 or 100,000 as appropriate.
  - expression: 'Point prevalence = (All existing cases at a point in time ÷ Total population) × multiplier'
    meaning: >
      The snapshot proportion of the population currently with the disease.
  - expression: 'Prevalence ≈ Incidence × Average duration'
    meaning: >
      For a stable chronic disease, prevalence is the product of how fast
      cases arrive and how long they stay.
summary: >
  Incidence is the flow of new cases into a population at risk over a period;
  prevalence is the stock of existing cases at a point in time. The bathwater
  analogy captures the relationship — incidence is water entering the tub,
  prevalence is the water level, and recovery and death are the drain —
  formalized as prevalence approximating incidence times average duration.
  Cross-sectional studies and screening measure prevalence, cohort studies
  and clinical trials measure incidence, and the choice matters because
  prevalence answers how common a disease is while incidence answers what
  the risk of getting it is. Finally, prevalence directly shapes test
  interpretation: at low prevalence even an excellent test yields a low
  positive predictive value, the single most tested idea connecting
  epidemiology to the diagnostic-test-accuracy question.
faqs:
  - question: Why can prevalence never exceed incidence in a very short-lasting disease?
    answer: >
      In diseases that resolve or kill quickly — the common cold, most acute
      infections — cases leave the pool as fast as they enter, so the
      snapshot count stays low no matter how fast new cases arrive. High
      prevalence needs duration: type 2 diabetes has modest incidence but
      lifelong duration, so its prevalence is enormous.
  - question: Which is the better measure for planning health services, incidence or prevalence?
    answer: >
      Prevalence, because services must care for everyone who currently has
      the disease, not only the newly diagnosed. Incidence is the better
      measure for identifying causes and for vaccine or prevention
      programmes, because only new cases can reveal the effect of exposures
      on risk.
  - question: In a stable population of 10,000 with 500 existing cases and 200 new cases in a year, what are the prevalence and incidence?
    answer: >
      Point prevalence at the start of the year = 500 ÷ 10,000 = 5 percent.
      The incidence during the year = 200 ÷ (10,000 − 500) = 200 ÷ 9,500 ≈
      2.1 percent per year, because the 500 existing cases are not at risk
      and must be removed from the denominator.
  - question: If a test has 90 percent sensitivity and 90 percent specificity, why does its positive predictive value change between populations?
    answer: >
      Predictive values depend on how many truly diseased people are in the
      tested group. At 1 percent prevalence, 1,000 people yield 9 true
      positives against 99 false positives — a positive predictive value of
      only about 8 percent. At 50 percent prevalence the same test yields 450
      true positives against 50 false positives — 90 percent. The test is
      unchanged; the base rate moved the answer.
references:
  - title: "Park's Textbook of Preventive and Social Medicine"
    source: Banarsidas Bhanot
  - title: "Gordis Epidemiology"
    source: Elsevier
  - title: "Bonita, Beaglehole, Kjellstrom: Basic Epidemiology"
    source: World Health Organization
author: soban-rasheed
publishedDate: 2026-08-16
updatedDate: 2026-09-05
popular: false
---

## Introduction

Incidence and prevalence are the two words students most often blur and
examiners most often separate. The blur is understandable — both are counts
of cases over people — but the distinction decides whether you are measuring
risk or measuring burden, and whether your study design is even capable of
the measurement you intend. These notes build the distinction from
definitions, through the analogy that makes it permanent, to the arithmetic
that appears in every paper and viva.

## Definitions

**Incidence** measures new cases:

> Incidence rate = (number of **new** cases arising during a specified
> period) ÷ (number of persons **at risk** during that period) × a
> convenient multiplier (per 1,000 or per 100,000).

The denominator is the population at risk — existing cases are excluded,
because a person who already has the disease cannot become a new case of it.
Depending on the data, this is refined into an incidence density
(person-time) when follow-up times differ.

**Prevalence** measures existing cases:

> Point prevalence = (all cases existing at a given moment) ÷ (total
> population at that moment) × multiplier.

**Period prevalence** counts everyone who had the disease at any time during
a defined span — existing at the start plus new during it — divided by the
population. Exams usually mean point prevalence unless they say otherwise.

The critical contrast in one line: **incidence is a rate with a time
dimension; point prevalence is a proportion, a snapshot.**

## The Bathwater Analogy

Picture a bathtub:

- The **faucet** is incidence — new cases flowing in.
- The **water level** is prevalence — how much disease is present right now.
- The **drain** is recovery and death — cases leaving the pool.

Three consequences follow immediately:

1. Turn the faucet up (higher incidence) and the level rises.
2. Block the drain (better treatment that prolongs life without curing, as
   in AIDS after antiretroviral therapy or many cancers) and the level rises
   **even as incidence stays flat** — a public health success that increases
   prevalence.
3. A fast drain (rapid cure or rapid death) keeps the level low even with a
   strong faucet.

This is why chronic diseases dominate prevalence tables while acute
infections dominate incidence reporting.

## The Relationship: P ≈ I × D

In a steady state, where incidence and duration are roughly constant:

> **Prevalence ≈ Incidence × Average duration**

Worked example: an incidence of 2 per 1,000 per year and an average disease
duration of 5 years gives a prevalence of about 10 per 1,000 — one percent
of the population living with the disease at any moment. Rearranged, the
same relation lets you estimate any one of the three from the other two, a
favourite one-mark MCQ.

## Which Study Design Measures Which?

| Design | Measures | Why |
|---|---|---|
| Cross-sectional survey | Prevalence | One time point; cases are counted, not watched for onset |
| Cohort study | Incidence | Defined population followed forward; new cases observed as they occur |
| Randomized controlled trial | Incidence (in each arm) | Follow-up from intervention to outcome |
| Surveillance and registry data | Incidence and prevalence | Notifiable disease counts feed both |
| Screening programme data | Prevalence (heavily) | Screening preferentially finds long-duration cases — length-time bias |

The case-control study measures neither directly — it starts from cases and
controls and estimates an odds ratio — but it is conceptually anchored to
incidence, which is why its results approximate incidence-rate ratios when
the disease is rare.

## Worked Numeric Examples

**Example 1 — basic calculation.** A town of 10,000 has 500 people already
living with hypertension on 1 January; during the year, 200 more are
newly diagnosed.

- Point prevalence at 1 January = 500 ÷ 10,000 = **5 percent**.
- Incidence during the year = 200 ÷ (10,000 − 500) = 200 ÷ 9,500 ≈
  **2.1 percent per year** (21 per 1,000 per year).

Note both exam traps: the prevalence denominator is the whole population,
and the incidence denominator excludes the existing cases.

**Example 2 — prevalence drives predictive value.** A screening test with 90
percent sensitivity and 90 percent specificity is applied to two
populations of 1,000:

| | Population A (prevalence 1 percent) | Population B (prevalence 50 percent) |
|---|---|---|
| True positives | 9 | 450 |
| False positives | 99 | 50 |
| True negatives | 891 | 450 |
| False negatives | 1 | 50 |
| **Positive predictive value** | 9 ÷ 108 ≈ **8 percent** | 450 ÷ 500 = **90 percent** |
| **Negative predictive value** | 891 ÷ 892 ≈ **99.9 percent** | 450 ÷ 500 = **90 percent** |

The test did not change; the population did. In a low-prevalence setting —
screening the general public — most positives are false positives, which is
why screening programmes are targeted and confirmatory tests are mandatory.
This is the bridge into the [diagnostic test accuracy topic
hub](/topics/diagnostic-test-accuracy/), where sensitivity, specificity and
predictive values are treated in full.

## Exam Framing

A viva framing that recurs: *your district shows a rising prevalence of
diabetes but a stable incidence — interpret.* The correct reasoning: the
flow of new cases has not increased, but cases are accumulating — either
better survival, earlier detection, longer duration, or in-migration of
cases. Distinguish cause before celebrating or panicking. The mirror-image
question — falling prevalence with stable incidence — points to faster cure
or faster death. Examiners award marks for the reasoning, not the recall.

## Revision Pointers

Write the two formulas side by side and annotate the denominators — that is
where the marks are lost. Practice the bathtub explanation aloud, because
viva examiners reward a clear analogy used precisely. Then work the two
numeric examples until the predictive-value flip feels obvious rather than
surprising, and drill with the [community medicine practice
quiz](/practice/quiz/community-medicine/). For the biostatistics that
follows — rates standardization and test statistics — keep the [diagnostic
test accuracy topic hub](/topics/diagnostic-test-accuracy/) and these notes
together in revision.
