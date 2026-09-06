# NOCTURNE — interactive presentation kit

A dependency-free HTML deck system for 30-minute technical talks, plus nine finished
decks. Everything is static files: no build step, no server, no framework. Open a
deck in a browser and present; print it to PDF to hand the same content to Canva.

Start at **[`index.html`](index.html)** — it links every deck.

```
index.html                    hub: the nine talks, key map, Canva path
template/
  deck.css                    theme tokens, layouts, print stylesheet
  deck.js                     navigation · timer · quizzes · widget bootstrap
  widgets.js                  the five shared production tools (decks 06-09 each
                              carry their own inline widget instead)
  showcase.html               layout + tool-layer reference (start authoring here)
decks/
  01-self-hosting-3090.html   25 slides · tool: vram
  02-fine-tuning.html         22 slides · tool: ft-est
  03-tokens-specdec-moe.html  20 slides · tool: tok-sandbox
  04-red-teaming-llms.html    20 slides · tool: guard-sim
  05-agent-swarms.html        17 slides · tool: graph-run
  06-ai-guardrails.html       24 slides · tool: gw-sim      (inline)
  07-partners-and-gateways.html 26 slides · tool: partner-sim (inline)
  08-generative-video-images.html 24 slides · tool: gen-est   (inline)
  09-bio-robots-futures.html  25 slides · tool: future-dial (inline)
research/
  notes/*.md                  per-topic research notes with sources
  examples/deep_research_swarm.py   runnable agent-graph example (deck 05)
.scratch/verify.js            headless render + widget exercise (Playwright)
.scratch/overflow.js          per-slide overflow scan
.scratch/pacing.js            budgets vs agenda labels vs HUD position
.scratch/pdfall.js            Canva print path: 1 slide = 1 page at 1280x720
.scratch/hubcheck.js          hub links + showcase widget smoke test
.scratch/sync_agenda.py       regenerate agenda minute labels from data-time
.scratch/tree.js              layout tree for one slide (node tree.js <deck> "<text>")
```

## Presenting

| key | action |
| --- | --- |
| `→` `Space` `PageDown` | next fragment, then next slide |
| `←` `PageUp` | back (hides builds first) |
| `Home` / `End` | first / last slide |
| `O` | overview grid |
| `S` | speaker notes + time budget for this slide |
| `T` / `R` | start-pause the 30-minute timer / reset |
| `F` | fullscreen |
| `?` | key map |

Slide state is in the URL (`#s7`), so you can deep-link. Slides carry
`data-time="1.5"` budgets; section slides carry `data-section="2 · Weights"` and show
up in the HUD and overview. `body data-duration="30"` sets the timer.

## Authoring a deck

Copy a deck and rewrite the slides. A slide is:

```html
<section class="slide" data-time="1.5">
  <div class="kicker">eyebrow</div>            <!-- mag | grn | vio | amb variants -->
  <h2>The conclusion, not the topic</h2>
  <div class="content">… .cols .card .t table .bars .flow …</div>
  <aside class="notes">Speaker notes — shown with S, never on the slide, never printed.</aside>
</section>
```

Colour semantics are load-bearing: **cyan** = info · **green** = good · **magenta** =
risk · **amber** = cost/time · **violet** = idea/model. Add `class="frag"` to any
element to make it a build step. `template/showcase.html` demonstrates every layout.

### The tool layer

A live tool is one function registered under a name — either in `template/widgets.js`
(shared) or in an inline `<script>` in the deck itself, placed **before** the
`widgets.js` / `deck.js` tags (that is how decks 06-09 do it, so a deck-specific tool
never touches shared code):

```js
window.DeckWidgets["my-tool"] = function (root, DECK) {
  root.innerHTML = "…";                        // plain DOM, no framework
};
```

```html
<div data-widget="my-tool"></div>
```

Load order matters — `widgets.js` before `deck.js`, because `deck.js` walks
`[data-widget]` once at boot. Long-running tools subscribe to
`DeckHooks.onSlideChange(fn)` and clear their timers when the presenter leaves, so a
forgotten animation cannot keep running under other slides.

The five shipped tools:

| name | deck | what the audience does |
| --- | --- | --- |
| `vram` | 01 | picks model / quant / engine / context, reads weights + KV + runtime against 24 GB, gets a memory-bound tok/s band |
| `ft-est` | 02 | picks model / method / dataset / epochs, gets training VRAM and wall clock on one 3090 |
| `tok-sandbox` | 03 | types any language, watches fragmentation and the cost multiplier |
| `guard-sim` | 04 | tries to smuggle a prompt past an English/Latin rule set — and succeeds in Spanish |
| `graph-run` | 05 | runs a swarm: fan-out, verifier failure, bounded retry, human gate |
| `gw-sim` | 06 | sends requests and attacks through the gateway with tiers off, guard on, allowlist on — and reads the audit log line it produced |
| `partner-sim` | 07 | picks an org profile, ranks the vendor field per token, then pulls a shock (price cut, export freeze, EU enforcement) and watches the ranking move |
| `gen-est` | 08 | picks model / GPU / resolution / frames / quant and gets "does it fit" plus seconds per clip, anchored on measured 4090 runs |
| `future-dial` | 09 | toggles five real governance levers and reads which harm channel each one moves — labelled as a scenario model, not a forecast |

Each tool is **labelled as a heuristic on-slide**. They teach the shape of a
calculation, not a precise value; the calculator constants are calibrated against
published numbers (GGUF file sizes, Unsloth throughput reports) and the readouts say
±40% where that is honest.

## Into Canva

1. Open the deck in Chrome → Print → **Save as PDF**, *Background graphics* on, margins *None*.
   The print stylesheet emits one 1280 × 720 page per slide, fragments revealed, chrome and
   notes removed. Verified: deck 01 → 25 pages at exactly 1280 × 720.
2. Canva → **Upload** → drop the PDF → each page becomes an editable slide with live text.
3. For image-only import, render PNGs headlessly (see *Verification*).

Interactivity does not survive the PDF — present from the browser and treat the Canva
file as the leave-behind. Both come from the same source, so they cannot drift.

## Pacing

Every slide carries `data-time`; every section starts at a `data-section` divider. Each
deck's budgets total **28 minutes** inside a 30-minute slot, and the agenda's per-stop
numbers are generated from those budgets — `.scratch/sync_agenda.py` rewrites them, so
the agenda, the HUD and the `T` timer cannot drift apart.

## Verification

Needs a Playwright install and cached Chromium (any existing checkout works):

```bash
NODE_PATH=/path/to/node_modules node .scratch/verify.js      # render + exercise every widget
NODE_PATH=/path/to/node_modules node .scratch/overflow.js    # per-slide overflow scan
NODE_PATH=/path/to/node_modules node .scratch/pdfall.js      # Canva print path, pages per deck
NODE_PATH=/path/to/node_modules node .scratch/pacing.js      # budgets vs agenda labels
python3 .scratch/sync_agenda.py                              # re-sync agenda numbers
```

Last run (2026-09-04): **219 slides across 10 files** (9 decks + showcase), no console
errors, no overflow, agenda budgets totalling 28 min in every deck, and every deck
printing exactly one 1280 × 720 page per slide (25/22/20/20/17/24/26/24/25).

`verify.js` loads each deck, fails on console errors, clicks every preset and slider,
and asserts the tools produce the numbers the speaker notes promise. `overflow.js`
measures every slide with builds revealed and animations settled.

## Research

`research/notes/` holds one file per topic (nine topics, eleven notes — red-teaming has
three) with claims, numbers and where each came
from; the fetched primary sources are saved under `.research/`, `.scratch/` and
`research/_raw/` so citations can be checked offline. Deck footers cite the specific
paper, repo or model card behind every number — including the 2026 material
(DFlash `arXiv:2602.06036`, DSpark / DeepSeek `arXiv:2607.05147`, EAGLE-3
`arXiv:2503.01840`).
