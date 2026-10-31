# Citation studio research

Cutoff: 2026-10-13 America/Los_Angeles. All accesses below: 2026-10-13. Search emphasized September 1-October 13; foundational sources retained for definitions. Dates unavailable from inspected sources are unknown, not inferred from crawl dates. Live docs are observations, not version-pinned 2026 releases. No post-cutoff releases or claims used.

| Source | Publication | Revision | Version/release | Relevance |
| --- | --- | --- | --- | --- |
| [W3C Annotation](https://www.w3.org/TR/annotation-model/) | 2017-02-23 | 2017-02-23 | Recommendation | Code-point selectors plus exact quote/context; hash-bound offline export is narrower than a general annotation platform. |
| [AIS](https://arxiv.org/abs/2112.12870v2) | 2021-12-23 | 2022-08-02 | v2 | Two-stage interpretability/attribution protocol; do not infer interpretability from a support verdict. |
| [ALCE](https://arxiv.org/abs/2305.14627v2) | 2023-05-24 | 2023-10-31 | v2 | ASQA/QAMPARI/ELI5, automatic citation precision/recall and human evaluation; chosen pinned external label corpus. |
| [ALCE artifact/license](https://github.com/princeton-nlp/ALCE/tree/246c476a4edfc564266b7346b6e29ef4861ae937) | unknown | unknown | 246c476a4edfc564266b7346b6e29ef4861ae937 | MIT repository material, underlying passages keep source rights; fetched checksum pinned. |
| [AttributionBench](https://arxiv.org/abs/2402.15089v1) | 2024-02-23 | 2024-02-23 | v1 | Aggregates attribution datasets; labels evaluate support rather than byte identity. Not imported into this benchmark. |
| [ExpertQA](https://huggingface.co/datasets/cmalaviya/expertqa/blob/main/README.md) | unknown | unknown | main card accessed | Domain expert questions and attributed answers; original source dates/licensing must be checked before redistribution. Research only. |
| [HAGRID](https://huggingface.co/datasets/miracl/hagrid/blob/main/README.md) | unknown | unknown | card b2a0859 | MIRACL-based answers/quotes with attribution flags including null; card Apache2.0, underlying passage rights separate. Research only. |
| [RAGTruth](https://arxiv.org/abs/2401.00396) | 2024-01-01 | unknown | version/date beyond first submission unknown | Word-level hallucination corpus. Different task from source staleness; not bundled. |
| [Ragas faithfulness](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) | unknown | unknown | stable docs, release unknown | Model-scored claim support fraction; product records humans and never runs this judge. |
| [TruLens](https://www.trulens.org/getting_started/core_concepts/feedback_functions/) | unknown | unknown | docs, release unknown | Feedback-function framework for retrieval/groundedness; not an offline annotation packet replacement. |
| [Label Studio](https://docs.humansignal.com/guide/) | unknown | unknown | docs, release unknown | General labeling workflow/platform; compare task completion and agreement, not source hashes as semantic accuracy. |
| [Argilla](https://docs.argilla.io/latest/) | unknown | unknown | latest docs, release unknown | Feedback datasets and reviewer workflows; broader hosted/local service model, not single HTML portability. |
| [Hypothesis client](https://github.com/hypothesis/client) | unknown | unknown | repository snapshot accessed | General web annotation client/service ecosystem. Recent GitHub search showed October 4 update, not a verified release. |
| [LangSmith run shape](https://reference.langchain.com/javascript/langsmith/index/Run) | unknown | unknown | reference docs, release unknown | Explicit run inputs/outputs; only documented string/document-array subset imported. No API or arbitrary tree parser. |
| [LangChain RetrievalQA](https://reference.langchain.com/python/langchain-classic/chains/retrieval_qa/base/BaseRetrievalQA/return_source_documents) | unknown | unknown | reference attempted; browser fetch unavailable | Parent primary reference plus tests support result/source_documents subset. No complete vendor conformance claim. |
| [Recent controlled RAG citation study](https://arxiv.org/abs/2609.23053v1) | 2026-09-19 | 2026-09-19 | v1 | Post-rationalization study separates plausible support from whether a model used a source. No study numbers copied as our measurements. |

## How similar tools are evaluated

ALCE evaluates generated answer quality and citation support over ASQA, QAMPARI and ELI5, with both automatic scorers and supplied human labels. AIS defines a two-stage annotation protocol. AttributionBench aggregates attribution classification problems; ExpertQA adds domain experts and HAGRID supplies answer/sentence attribution judgments. RAGTruth uses token/span hallucination annotations. These tasks cannot be scored by hashes or selection coordinate correctness alone.

This studio therefore measures integrity separately: exact Unicode round trips, changed-source detection and preserved external labels. A naive code-point-as-UTF16 script is a reproducible coordinate baseline. The external ALCE subset preserves20 supplied citation labels; no semantic predictions are produced, so semantic accuracy is null. The human protocol remains collection-ready, not a completed agreement study. Ragas/TruLens model scoring and native ALCE model execution were omitted; no model or human costs/results fabricated.

For workflow platforms (Label Studio, Argilla, Hypothesis), useful comparisons include import/export fidelity, keyboard completion, reviewer disagreement and time per labeled item. Our Playwright run measures explicitly scripted operations/errors, not human annotation speed. It establishes a reproducible workflow path, not productivity adoption. The recent September 19 citation paper motivates separating support from source use; the product cannot prove causal use or source truth.

## Positioning and integration

For evaluation owners reviewing local RAG outputs, Siftgrain Cite keeps exact evidence, human rationale and disagreement portable without uploading text. Common trace adapters and CSV/label exports bridge local evaluation workflows; W3C export bridges annotation consumers. The native packet is canonical. No account, hosted collaboration, model judge, arbitrary trace tree support or independently verified reviewer identity is promised. Full ALCE/AIS native consumer compatibility remains a separate partial requirement because those consumers require fields not present in arbitrary packets.

## Dataset choice and rights

Reused frozen ALCE commit/checksum documented in benchmarks/DATASHEET.md and studies/ais-pilot/README.md. External passages are not committed; fetch script plus local archives avoids claiming tool MIT covers Wikipedia. The artifact is older than the preferred2025-2026 window but has real supplied attribution labels, reproducible pinning and existing tested adapter. Newer research was reviewed without silently inventing a redistributable2026 gold corpus. HF Spaces/leaderboard-specific evaluation artifacts were not adopted; coverage is partial rather than a complete market census.

## Name collision evidence

See docs/name-checks.json for GitHub/npm/PyPI/HF exact searches and trademark-style web query. Family Siftgrain, descriptor Cite; Spanward rejected. Search absence is not legal clearance. No remote repository rename, transfer or domain availability is claimed.
