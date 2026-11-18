# Phase 2 handoff — 2026-11-17

## Status: NOT READY

Core local integration and regression checks pass, but RAG gold coverage, human approvals, provenance/legal review, and repository-wide formatting remain unresolved. No Phase 3/4 work, live evaluation, merge, or push was performed; `.env` was not read.

## Completed and verified

- `DATASET_PROFILE=clinicaltrials-20` is an explicit opt-in; fixtures remain the default. It combines 2 hash-approved studies and 18 pending-review records: 20 unique studies, 20 study documents and 330 criterion passages (30 from the two approved studies and 300 new passages still marked `manual_review`). Corpus tests verify access to all 20; API and Edge E2E verify a real NCT result, citation display, and matcher `unknown` for unapproved criteria.
- RAG-002’s targeted query bug was missing expansion from “renal health” to eGFR/albumin terms. Clinical lexicon v3 plus a regression assertion retrieves both existing gold passage IDs in top 5; no gold labels, cutoffs, or thresholds changed.
- Evaluator passage-ID reconstruction now uses explicit retrieval `passageIds`, not formatted context or expansion of `sourceIds`.
- Final checks: typecheck PASS; lint PASS; Vitest 59 files/272 tests PASS; retrieval suite 8 files/42 tests PASS; API smoke 1/1 PASS; build PASS (Vite warns bundle is 500.23 kB, just over 500 kB); offline RAG PASS; Playwright Edge 2/2 PASS, process exit 0 and no listener remained on ports 43173/5175; `git diff --check` PASS.
- The final paired offline report is [`offline-fake-2026-11-17T22-42-56.104Z/summary.json`](../eval/results/rag/offline-fake-2026-11-17T22-42-56.104Z/summary.json). Across its two ranking cases, study nDCG@2 is 1 for lexical/hybrid/reranked. Passage nDCG@5: RAG-001 `.613147` for all; RAG-002 `.501266` lexical/hybrid and `.693426` reranked (paired passage delta `+.192161`). Behavior cases have no ranking metrics.

## Changes in this working tree

- `apps/server/src/config/index.ts`, `service/trialmatch.ts`, `retrieval/corpus.ts`, and `packages/shared/src/index.ts`: opt-in real-20 profile, split-draft loading and raw-extracted criteria support; unapproved criteria remain matcher-unknown.
- `apps/server/src/retrieval/query.ts`: targeted renal terminology expansion and lexicon version `sr-en-clinical-v3`; related tests cover profile, corpus/API availability, and RAG-002 regression.
- `scripts/e2e-webserver.mjs`, `scripts/e2e-global-teardown.mjs`, `playwright.config.ts`, and `apps/web/e2e/phase-2-user-flow.spec.ts`: one in-process API/Vite E2E host with explicit shutdown and real-20 browser coverage.
- `eval/rag/JELENA_REVIEW.md` and RAG task/readiness/evidence docs: proposed labels are clearly pending and human decisions are separated from source-content validation.

The global `pnpm format:check` failed because Prettier reports 210 files repository-wide, mostly pre-existing/unrelated formatting. No mass formatting was applied. The immutable `eval/rag/baseline-v2.json` was not overwritten; its generator returned `EEXIST` as intended.

## Not done / decisions required

- **3.3 benchmark freeze:** Jelena must adjudicate proposed cases, then freeze a new versioned dataset/corpus/hash; never treat proposals as gold.
- **4.2 reranker:** current paired comparison is only two ranking cases and fake/hash embeddings; repeat on a larger adjudicated set.
- **6 provenance/terms:** record query/filter/pagination and cohort completeness; assess third-party rights and operational obligations before redistribution/use.
- **5.3 approved-rule demo:** prepare further demo patients only from already hash-approved rules and verify expected outcomes; no rules were approved here.
- **5.2 per-criterion approval:** not implemented; minimum safe alternative is to include only individually reviewed criteria in a reviewed study-level draft/hash and keep every other criterion `manual_review`/`unknown`.
- Jelena must decide RAG-P001–P004 (confirmed/corrected/rejected, reviewer/date/rationale and IDs). The negative P003 proposal applies only to its five-study snapshot, not the real-20 cohort.
- The 18 additional studies contribute only `unknown` to automated matcher decisions; source-content confirmation is not approval of their extracted structured rules.

## Limitations that govern interpretation

Lexicon-v3 measurements are a separate run and are **not comparable** to frozen `baseline-v2`; the v3 fix is targeted at RAG-002 and does not establish general retrieval quality. Hash embeddings are not semantic evidence. Two ranking cases are too few for a robust reranker conclusion. ClinicalTrials.gov provenance records endpoints, dates and hashes, and its terms require attribution, currentness, processed-date disclosure and modification description; third-party rights may apply, so this is not blanket legal clearance. P003 is negative only within its five-study snapshot. The 18 new studies remain matcher-unknown.

