# SeNARS (Semantic Non-axiomatic Reasoning System)

**SeNARS** is the kernel for a new generation of cognitive architectures. It fuses the **fluid creativity** of Large Language Models (LLMs) with the **rigorous logic** of Non-Axiomatic Reasoning Systems (NARS).

It turns the "black box" of AI into an **observable, trustworthy, and self-improving stream of thought**.

The system implements a continuous, stream-based dataflow architecture that processes streams of *premises* into streams of *conclusions*, bridging the gap between neural pattern matching and symbolic reasoning.

## Who Should Read This

- **Researchers**: Exploring hybrid neuro-symbolic AI and non-axiomatic reasoning
- **Developers**: Building AI systems that combine logic and language models
- **Educators**: Teaching AI reasoning concepts with observable examples
- **Learners**: Understanding how formal reasoning and neural networks can work together
- **Visionaries**: Looking for the next step beyond "Chatbots"

## The Problem: Why Hybrid?

We are currently facing a dichotomy in AI:

1.  **Large Language Models (LLMs)** are creative, fluent, and vast, but they are prone to **hallucination**, lack **epistemic state**, and struggle with **long-term consistency**. They are "Dreamers".
2.  **Symbolic Logic (GOFAI)** is rigorous, explainable, and trustworthy, but it is often **brittle**, can't handle **ambiguity**, and lacks **common sense**. It is a "Calculator".

**SeNARS is the Bridge.**

It uses the LLM as a "subconscious" substrate for pattern matching and text generation, while the NARS architecture provides the "conscious" executive function—maintaining beliefs, pursuing goals, and enforcing logical consistency.

## How to Navigate the Documentation

Start your journey based on your goal:

1. **"I want to try it out"** → [Quick Reference](README.quickref.md) + [Usage Guide](README.usage.md)
2. **"I want to understand how it works"** → [Architecture](README.architecture.md) + [Core Components](README.core.md)
3. **"I want to extend or customize it"** → [Configuration](README.config.md) + [Development Guide](README.development.md)
4. **"I want to understand the vision"** → [Vision & Philosophy](README.vision.md) + [Roadmap](README.roadmap.md)

## Key Terminology

- **NAL (Non-Axiomatic Logic)**: A formal logic system designed for reasoning with insufficient knowledge and resources
- **Stream Reasoner**: A continuous dataflow architecture that transforms streams of premises into streams of conclusions
- **Narsese**: The formal language for expressing knowledge in NARS (e.g., `(bird --> animal).`)
- **Truth Value**: A `{frequency, confidence}` pair representing certainty of beliefs
- **Task**: A unit of work containing a term, truth value, and processing metadata
- **Premise**: Input knowledge used for inference
- **Derivation**: New knowledge inferred from existing premises

## System Definition

SeNARS operates as a **Stream Reasoner**, utilizing a non-blocking pipeline to handle synchronous NAL logic and asynchronous Language Model calls simultaneously. This architecture ensures responsiveness and scalability even when processing complex reasoning chains or integrating with external AI services.

For detailed architecture, see [README.architecture.md](README.architecture.md).

## Summary

SeNARS is a sophisticated hybrid neuro-symbolic reasoning system that combines the precision of formal logic with the flexibility of neural language models. Built on immutable data structures and a component-based architecture, it provides an observable platform for advanced AI reasoning with:

- **Hybrid Intelligence**: Seamless integration of symbolic (NAL) and neural (LM) reasoning
- **Self-Improving Architecture**: Intelligence that grows through use and experience
- **Observable Reasoning**: Clear visibility into how conclusions are reached
- **Practical Applications**: From knowledge discovery to decision support systems
- **Robust Design**: Fault-tolerant with graceful degradation and comprehensive error handling

The system's architecture enables compound intelligence where each addition enhances overall capabilities, making it suitable for research, education, and production applications requiring transparent and adaptable AI reasoning.

## Where to Go Next

- **Ready to run it?** Jump to the **[Quick Reference](README.quickref.md)**.
- **Want to understand the "Why"?** Read the **[Vision & Philosophy](README.vision.md)**.
- **Want to understand the "How"?** Explore the **[Architecture](README.architecture.md)**.

## References

- Wang, P. (2013). _Non-Axiomatic Logic: A Model of Intelligent Reasoning_. World Scientific.
- OpenNARS https://github.com/opennars
- NARchy http://github.com/narchy
- NARS-GPT https://github.com/opennars/NARS-GPT
- Hammer, P. and Lofthouse, T. (2020). ANSNA: An attention-driven non-axiomatic semantic navigation architecture. _AGI_ https://github.com/patham9/ANSNA
- NARCES - https://www.proquest.com/openview/65226a4235b1b3f45a155267d08e7994/1?pq-origsite=gscholar&cbl=18750
