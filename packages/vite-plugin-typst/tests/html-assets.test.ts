import { describe, expect, it } from "vitest";
import { transformHtmlAssets } from "../src/html-assets";

describe("HTML asset transform", () => {
  it("rewrites src, poster, and srcset values to Vite url imports", () => {
    const result = transformHtmlAssets(
      '<img src="./one.png" srcset="./small.png 1x, ./large.png 2x"><video poster="/poster.jpg"></video>',
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./one.png?url";',
      'import __typst_asset_1 from "./small.png?url";',
      'import __typst_asset_2 from "./large.png?url";',
      'import __typst_asset_3 from "/poster.jpg?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
    expect(result.htmlExpression).toContain("__typst_asset_1");
    expect(result.htmlExpression).toContain("__typst_asset_2");
    expect(result.htmlExpression).toContain("__typst_asset_3");
  });

  it("leaves external, data, hash, and vite-ignore urls alone", () => {
    const html =
      '<img src="https://example.com/a.png"><img src="data:image/png;base64,abc"><use href="#icon"></use><img vite-ignore src="./skip.png">';
    const result = transformHtmlAssets(html);

    expect(result.imports).toEqual([]);
    expect(result.htmlExpression).toBe(JSON.stringify(html));
  });

  it("processes allowed meta image fields", () => {
    const result = transformHtmlAssets(
      '<meta property="og:image" content="./social.png"><meta name="viewport" content="./ignored.png">',
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./social.png?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
    expect(result.htmlExpression).toContain("./ignored.png");
  });

  it("skips tags inside HTML comments", () => {
    const html = '<!-- <img src="./old.png"> --><img src="./real.png">';
    const result = transformHtmlAssets(html);

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./real.png?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
    expect(result.htmlExpression).not.toContain("__typst_asset_1");
  });

  it("handles > inside attribute values", () => {
    const html = '<img src="./photo.jpg" alt="size > 1000">';
    const result = transformHtmlAssets(html);

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./photo.jpg?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
  });

  it("filters link tags by rel attribute", () => {
    const result = transformHtmlAssets(
      [
        '<link rel="stylesheet" href="./style.css">',
        '<link rel="icon" href="./favicon.ico">',
        '<link rel="canonical" href="./page">',
        '<link rel="alternate" href="./feed.xml">',
        '<link rel="dns-prefetch" href="//cdn.example.com">',
        '<link rel="manifest" href="./manifest.json">',
      ].join(""),
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./style.css?url";',
      'import __typst_asset_1 from "./favicon.ico?url";',
      'import __typst_asset_2 from "./manifest.json?url";',
    ]);
    // canonical and alternate should be left untouched
    expect(result.htmlExpression).toContain("./page");
    expect(result.htmlExpression).toContain("./feed.xml");
  });

  it("processes script src attributes", () => {
    const result = transformHtmlAssets(
      '<script src="./app.js"></script><script src="https://cdn.example.com/lib.js"></script>',
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./app.js?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
    // External script should be left alone
    expect(result.htmlExpression).toContain("https://cdn.example.com/lib.js");
  });

  it("rewrites url() references inside inline style tags", () => {
    const result = transformHtmlAssets(
      '<style>.bg { background: url("./hero.jpg"); }</style>',
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./hero.jpg?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
  });

  it("handles multiple url() references in a single style tag", () => {
    const result = transformHtmlAssets(
      "<style>.a { background: url('./one.png'); } .b { background: url(./two.png); }</style>",
    );

    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./one.png?url";',
      'import __typst_asset_1 from "./two.png?url";',
    ]);
    expect(result.htmlExpression).toContain("__typst_asset_0");
    expect(result.htmlExpression).toContain("__typst_asset_1");
  });

  it("skips external and data url() references in style tags", () => {
    const html =
      '<style>.a { background: url("https://example.com/bg.png"); } .b { background: url("data:image/png;base64,abc"); }</style>';
    const result = transformHtmlAssets(html);

    expect(result.imports).toEqual([]);
    expect(result.htmlExpression).toBe(JSON.stringify(html));
  });

  it("processes SVG use and image elements", () => {
    const result = transformHtmlAssets(
      '<svg><use href="./sprite.svg#icon"></use><image href="./graphic.png"></image></svg>',
    );

    // use href starts with # (fragment only after stripping ./sprite.svg)
    // Actually, "./sprite.svg#icon" should be treated as asset URL since it doesn't start with #
    expect(result.imports).toEqual([
      'import __typst_asset_0 from "./sprite.svg#icon?url";',
      'import __typst_asset_1 from "./graphic.png?url";',
    ]);
  });

  it("returns empty expression for empty HTML", () => {
    const result = transformHtmlAssets("");
    expect(result.imports).toEqual([]);
    expect(result.htmlExpression).toBe('""');
  });
});
