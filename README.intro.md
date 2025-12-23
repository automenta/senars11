# SeNARS (Semantic Non-axiomatic Reasoning System)

A hybrid neuro-symbolic reasoning system that combines Non-Axiomatic Logic (NAL) with Language Models (LM) to create an observable platform for exploring advanced AI concepts. The system implements a continuous, stream-based dataflow architecture for processing streams of premises into conclusions.

## Who Should Read This

- **Researchers**: Exploring hybrid neuro-symbolic AI and non-axiomatic reasoning
- **Developers**: Building AI systems that combine logic and language models
- **Educators**: Teaching AI reasoning concepts with observable examples
- **Learners**: Understanding how formal reasoning and neural networks can work together

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

SeNARS is a **Stream Reasoner**: A continuous, stream-based dataflow architecture that transforms streams of premises into streams of conclusions. It utilizes a non-blocking pipeline to handle synchronous NAL logic and asynchronous Language Model calls simultaneously.

For detailed architecture, see [README.architecture.md](README.architecture.md).

## Summary

SeNARS is a sophisticated hybrid neuro-symbolic reasoning system that combines the precision of formal logic with the flexibility of neural language models. Built on immutable data structures and a component-based architecture, it provides an observable platform for advanced AI reasoning with:

- **Hybrid Intelligence**: Seamless integration of symbolic (NAL) and neural (LM) reasoning
- **Self-Improving Architecture**: Intelligence that grows through use and experience
- **Observable Reasoning**: Clear visibility into how conclusions are reached
- **Practical Applications**: From knowledge discovery to decision support systems
- **Robust Design**: Fault-tolerant with graceful degradation and comprehensive error handling

The system's architecture enables compound intelligence where each addition enhances overall capabilities, making it suitable for research, education, and production applications requiring transparent and adaptable AI reasoning.

## References

- Wang, P. (2013). _Non-Axiomatic Logic: A Model of Intelligent Reasoning_. World Scientific.
- OpenNARS https://github.com/opennars
- NARchy http://github.com/narchy
- NARS-GPT https://github.com/opennars/NARS-GPT
- Hammer, P. and Lofthouse, T. (2020). ANSNA: An attention-driven non-axiomatic semantic navigation architecture. _AGI_ https://github.com/patham9/ANSNA
- NARCES - https://www.proquest.com/openview/65226a4235b1b3f45a155267d08e7994/1?pq-origsite=gscholar&cbl=18750
