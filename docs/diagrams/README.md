# Diagrams

One diagram per question. Sources are Mermaid (`.mmd`) so they diff in git and
render on GitHub; the PNGs are for the slides.

| File | Question it answers | Deck slide |
|---|---|---|
| `01-consent-journey` | How does a fintech get a customer's data — and lose it? | Demo / flow |
| `02-consent-lifecycle` | What states can a consent be in, and what moves it? | 8 |
| `03-architecture` | What are the parts and who talks to whom? | 7 |
| `04-data-model` | What do we store — and what do we deliberately not store? | 17 |

## Re-render

```bash
cd docs/diagrams
npx -p @mermaid-js/mermaid-cli mmdc -i 01-consent-journey.mmd -o 01-consent-journey.png -c mermaid.config.json -b white -w 2200 -s 2
```

`mermaid.config.json` carries the app's palette so the diagrams match the UI.
Keep the vocabulary aligned with the code and the slides: *consent*, *client*,
*partner*, *gateway*.
