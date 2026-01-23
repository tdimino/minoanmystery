---
title: "Cognitive Steps"
tags:
  concepts: [cognitive-steps, pure-functions, functional-programming, testable-ai, composability, predictability]
  frameworks: [open-souls, daimonic-soul-engine]
---

# Cognitive Steps

*AI thinking should be testable, predictable, and composable.*

---

## The Principle

A cognitive step is a **pure transformation**: it takes a memory state and produces a new memory state plus a result. Nothing else changes. No hidden side effects. No global state mutations.

This purity—borrowed from functional programming—makes AI cognition predictable and composable. You can reason about each step in isolation, test it independently, and combine steps into complex cognitive flows.

---

## What Is a Cognitive Step?

At its core, a cognitive step is a function with a specific shape:

```
(memory, instructions) → (new memory, result)
```

The step takes the soul's current memory and some instructions for what to think about. It returns an updated memory (containing the new thought) and the result of that thinking.

The critical property: **no side effects**. The step doesn't send messages, update databases, or modify anything outside its return value. It just thinks.

---

## Types of Cognition

Different cognitive steps serve different purposes in the soul's mental life:

### Speaking

The soul formulates a response for another being to hear. This is external cognition—thought shaped for communication. The result is language meant to be understood by someone else.

### Reasoning

The soul thinks through a problem privately. This is internal cognition—the stream of consciousness that processes information, makes connections, explores implications. No audience, just the soul working through its thoughts.

### Deciding

The soul chooses between options. Given a question and possible answers, the step returns a decision. This is constrained cognition—not open-ended generation, but selection from a defined space.

### Questioning

The soul asks itself yes-or-no questions. "Should I pursue this topic?" "Is this visitor ready to go deeper?" "Does this response match my personality?" These binary queries gate behavior, determining which paths the soul follows.

---

## The Power of Purity

### Testability

Because cognitive steps have no side effects, they're trivially testable. Give them input, check the output. No need to mock databases, intercept network calls, or worry about test pollution. The step is a closed system.

This testability compounds. You can write extensive test suites for each cognitive step, building confidence in the soul's mental operations one piece at a time.

### Predictability

Given the same memory and instructions, a cognitive step produces the same result (modulo the inherent variability of language models, which can be controlled with temperature settings).

This predictability means you can reason about soul behavior. You can trace why a particular response emerged, following the chain of cognitive steps that led to it.

### Composability

Pure functions compose naturally. You can chain cognitive steps:

1. Take memory
2. Apply reasoning step → get updated memory + thought
3. Apply questioning step → get updated memory + boolean
4. Based on boolean, apply speaking step → get final memory + response

Each step builds on the previous, passing memory forward. The complex cognitive flow emerges from simple parts.

---

## The Separation of Thinking and Acting

Cognitive steps think. They don't act.

This separation is intentional. The soul's mental operations are pure transformations. Anything that affects the world—sending messages, updating persistent storage, triggering external systems—happens elsewhere, outside the step.

Why maintain this boundary? Because it makes the system legible. You can look at a cognitive step and know exactly what it does: it thinks. The side effects, when they happen, are explicit and localized.

---

## Building Complex Cognition

Simple cognitive steps combine into sophisticated mental operations:

**Example: Responding to a Visitor**

1. **Contextualize**: Reasoning step gathers relevant context from memory
2. **Model**: Reasoning step updates understanding of the visitor
3. **Gate**: Questioning step asks "Should I speak now?"
4. **Generate**: Speaking step formulates the response
5. **Verify**: Questioning step asks "Does this match my personality?"
6. **Refine**: If verification fails, reasoning step adjusts approach
7. **Return**: Final speaking step produces the output

Each step is simple. The complexity emerges from composition.

---

## The Philosophical Foundation

This approach has roots in functional programming, but it also reflects something deeper about cognition itself.

Thinking is transformative. We take in information, process it, and produce new understanding. The "pure function" model captures this: cognition as transformation, not mutation.

And thinking is compositional. Complex thoughts build from simpler ones. We don't think monolithically—we chain insights, stack reasoning, combine perspectives. Cognitive steps model this natural structure.

---

## Key Insight

> *"AI thinking should be testable, predictable, and composable."*

When cognition is built from pure functions, we gain leverage. We can test mental operations in isolation. We can predict how the soul will think. We can compose simple thoughts into complex reasoning.

The alternative—opaque, side-effect-laden AI systems—produces behavior we can't understand, test, or trust. Cognitive steps offer a different path: clarity through purity.

---

<!-- RAG tags -->
[cognitive steps] [pure functions] [functional programming] [ai cognition] [composability] [testable ai] [predictable behavior] [speaking] [reasoning] [deciding] [questioning] [daimonic soul engine]
