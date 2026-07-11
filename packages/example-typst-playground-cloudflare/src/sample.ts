export const sampleSource = `#import "@preview/wordometer:0.1.5": word-count-of 
#set document(title: "Typst WASM Playground", author: "typst-wasm")
#set page(width: auto, height: auto, margin: 1.5cm)
#set text(font: "Libertinus Serif", size: 11pt)

= Typst WASM Playground

This preview was rendered on Cloudflare Workers for the first request. After
hydration, edits compile in the browser.

#let total = 42

- Fast local previews
- Same compiler API on server and client
- Deployable to Cloudflare Workers

$ integral_0^1 x^2 dif x = 1/3 $

The answer is #strong[#total].`;
