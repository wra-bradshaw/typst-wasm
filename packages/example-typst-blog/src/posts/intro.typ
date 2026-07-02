#set document(
  title: "Shipping Typst in React",
  description: "A short note compiled by vite-plugin-typst.",
  author: "typst-wasm",
  keywords: ("react", "vite", "typst"),
)
#set page(width: auto, height: auto, margin: 1.5cm)
#set text(font: "Libertinus Serif", size: 11pt)

= Shipping Typst in React

This post is a `.typ` file imported directly into a React app. Vite compiles it
to an HTML module before the browser loads the page.

The component receives the rendered HTML, document metadata, diagnostics, and
the dependency list from the plugin.
