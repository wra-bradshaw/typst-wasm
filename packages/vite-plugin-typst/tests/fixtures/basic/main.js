import document, { html, metadata, dependencies } from "./doc.typ";

globalThis.__typstFixture = {
  document,
  html,
  metadata,
  dependencies,
};

export { document, html, metadata, dependencies };
export default document;
