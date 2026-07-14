import document, { html, metadata, dependencies } from "./doc.typ?typst=html";

globalThis.__typstFixture = {
  document,
  html,
  metadata,
  dependencies,
};

export { document, html, metadata, dependencies };
export default document;
