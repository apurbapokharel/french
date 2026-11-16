# Plan — French for Canadian PR

Shared understanding reached on 2026-11-15. Nothing here is built yet.

## 1. Product

- **Purpose:** take people from zero French to the level that earns Canadian PR points. Nothing else is in scope (no travel, culture or literature French).
- **Audience:** people **already in Canada** on a work or study permit who read English comfortably. The interface is **English only, permanently**.
- **First user:** one tester with **zero French** on an **M1 Mac**. Opened to the general public later.
- **Cost:** **free forever**. No accounts, no ads, no paid servers.
- **Exams:** prepares for **both TEF Canada and TCF Canada**. Lessons are shared; the exam-practice section is split by test.
- **French variety:** standard international French, with notes on Canadian words (*courriel*, *fin de semaine*, *entrevue*) and Canadian accents in listening practice.

## 2. Milestones (one release per milestone)

| Milestone | CEFR | NCLC | PR value |
|---|---|---|---|
| **M1 (release 1)** | A1 | below 4 | none, foundation only |
| M2 | A2 | 4 | none, survival French |
| M3 | B1 | 5–6 | second-language CRS points start |
| M4 | B2 | 7 | French-category draws + up to +50 bonus CRS points |

Learners can stop at any milestone and know what they have earned. **How we measure** that a learner reached a milestone is **deferred** and tied to ML-8.

## 3. Architecture

### Monorepo layout

```
french/
├── CLAUDE.md               project overview
├── docs/                   plan, decisions, ML milestones
├── api/openapi.yaml        the only contract between web/ and ai/
├── web/                    Vite + TypeScript site → GitHub Pages   (owner: Claude)
│   └── CLAUDE.md
├── ai/                     Python package + local API server, no UI (owner: you)
│   └── CLAUDE.md
└── .github/workflows/
    ├── web-deploy.yml      runs only when web/ changes
    └── ai-ci.yml           runs only when ai/ changes
```

### One website, two speech engines

```
                    ┌─────────── Website (GitHub Pages) ───────────────────────┐
                    │  lessons · flashcards · reading · writing · drills        │
                    └───────────────┬──────────────────────────┬───────────────┘
           no install               │                          │      installed
                                    ▼                          ▼
              Whisper ≤300 MB as ONNX, in browser     Python server on localhost
              (release 2, ML-4)                       hardware scan → recommends model size
                                                      transcription + drill scoring (release 1)
```

- Without either engine, everything except speaking drills still works (lessons, flashcards, reading, writing, listening via the browser's built-in voice).
- The browser's built-in speech *recognition* is **not** used: in Chrome it sends audio to Google, which breaks the privacy rule.

### Two ML layers

| | Research layer | Serving layer |
|---|---|---|
| Goal | Understand and improve | Run fast on the learner's laptop |
| Tool | Hugging Face transformers (PyTorch) | whisper.cpp **or** faster-whisper, chosen by the ML-1 benchmark |
| Access | Everything: logits, teacher forcing, custom decoding | Mostly audio in, text out |
| Runs on | Your machine, notebooks, eval scripts | The learner's machine, behind the API |

Rule: research decides *what* to compute; serving decides *how to compute it fast*. The API spec separates them so either side can change without the website noticing.

```
website ──HTTP──▶ local server (API)
                   ├─ /transcribe ─▶ fast engine (chosen by benchmark)
                   └─ /score      ─▶ whichever method won in research
```

### Other decisions

- **Two models eventually:** Whisper ("what was said") plus a phoneme model ("how it was said"). Both endpoints go in the API spec now; only speech recognition is built in release 1.
- **Why two:** Whisper's built-in language model autocorrects learners, which hides pronunciation mistakes. A CTC phoneme model reports the sounds actually spoken.
- **Minimum hardware:** the app scans the learner's hardware and recommends a model. Baseline target is a CPU-only 8 GB laptop; a GPU is a bonus.
- **Supported operating systems:** Linux and macOS (Apple Silicon) first.
- **Privacy:** learner audio **never leaves their device**. Data comes from public datasets (FLEURS, Common Voice) plus clips contributed on purpose. If the project grows, we may ask learners to opt in to contributing data.
- **Install for release 1:** `uv tool install "git+https://github.com/apurbapokharel/french#subdirectory=ai"`. A real installer comes before the public launch.

## 4. Release 1 scope

- **Website:**
  - Milestone roadmap and the TEF / TCF exam guides.
  - A1 lessons and spaced-repetition flashcards.
  - Repeat-after-me speaking drills: compare what was said with the expected sentence and highlight missed words.
- **AI:** ML-0 to ML-3, through the local install.
- **Done when:** the M1 tester can complete the A1 lessons, flashcards and speaking drills using the local install.

## 5. ML path

| Step | Work | Release |
|---|---|---|
| ML-0 | Audio basics: waveforms, spectrograms, log-mel features, Whisper's architecture | 1 |
| ML-1 | Evaluation harness: WER/CER and text normalization on FLEURS, Common Voice and your own voice (a real beginner). Benchmark Whisper sizes and the two serving engines on Linux and the M1. Survey the Open ASR Leaderboard for newer models | 1 |
| ML-2 | Local FastAPI server, hardware scan, model recommender | 1 |
| ML-3 | Drill scoring that beats Whisper's autocorrection (token confidence, teacher forcing) | 1 |
| ML-4 | ONNX export, int8 quantization, PyTorch-vs-ONNX parity tests, publishing to the Hugging Face Hub with a manifest | 2 |
| ML-5 | Phoneme model and pronunciation scoring (G2P, alignment, Goodness of Pronunciation) | 2 |
| ML-6 | Text-to-speech comparison (browser voice, Piper, Kokoro, Canadian voices) | 2–3 |
| ML-7 | LoRA fine-tuning on accented French (optional) | later |
| ML-8 | Small on-device LLM grading open-ended speaking and writing against NCLC | 3–4 |

## 6. Content and project rules

- **Lessons:** Claude drafts them and flags anything uncertain. Each lesson shows an **"unreviewed"** badge until a fluent speaker approves it. A reviewer is recruited before the public launch.
- **Licences:** **MIT** for code, **CC BY 4.0** for lesson content. No contributor agreement.
- **Workflow:** feature branches, PRs into `main`, and `main` deploys automatically. Tags are prefixed per side (`web-v…`, `ai-v…`). Each folder has its own CI.

## 7. Still open

- Measuring and grading learners against NCLC levels (deferred to ML-8).
- Who the fluent French reviewer is.
- The GitHub repo is currently **private**. It must be made public for GitHub Pages on a free plan and for open-source contributions.
