import { parseFragment, type Token, type DefaultTreeAdapterMap } from "parse5";

interface Replacement {
  start: number;
  end: number;
  expression: string;
}

type Node = DefaultTreeAdapterMap["node"];
type ChildNode = DefaultTreeAdapterMap["childNode"];

const externalUrlRE = /^[a-z][a-z\d+.-]*:/i;

const srcAttributesByTag = new Map<string, Set<string>>([
  ["audio", new Set(["src"])],
  ["embed", new Set(["src"])],
  ["img", new Set(["src"])],
  ["image", new Set(["href", "xlink:href"])],
  ["input", new Set(["src"])],
  ["link", new Set(["href"])],
  ["object", new Set(["data"])],
  ["script", new Set(["src"])],
  ["source", new Set(["src"])],
  ["track", new Set(["src"])],
  ["use", new Set(["href", "xlink:href"])],
  ["video", new Set(["src", "poster"])],
]);

const srcsetAttributesByTag = new Map<string, Set<string>>([
  ["img", new Set(["srcset"])],
  ["link", new Set(["imagesrcset"])],
  ["source", new Set(["srcset"])],
]);

const allowedMetaName = new Set([
  "msapplication-tileimage",
  "msapplication-square70x70logo",
  "msapplication-square150x150logo",
  "msapplication-wide310x150logo",
  "msapplication-square310x310logo",
  "msapplication-config",
  "twitter:image",
]);

const allowedMetaProperty = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "og:audio",
  "og:audio:secure_url",
  "og:video",
  "og:video:secure_url",
]);

/** rel values on <link> whose href should be treated as asset URLs. */
const assetLinkRels = new Set([
  "stylesheet",
  "icon",
  "shortcut icon",
  "apple-touch-icon",
  "apple-touch-icon-precomposed",
  "mask-icon",
  "manifest",
]);

const isAssetUrl = (value: string): boolean =>
  value !== "" &&
  !value.startsWith("#") &&
  !value.startsWith("//") &&
  !externalUrlRE.test(value);

const isElement = (
  node: Node | ChildNode,
): node is DefaultTreeAdapterMap["element"] =>
  "tagName" in node && typeof node.tagName === "string";

const isTextNode = (
  node: Node | ChildNode,
): node is DefaultTreeAdapterMap["textNode"] => node.nodeName === "#text";

/**
 * Locate the value content (excluding quotes) within a raw attribute string
 * extracted from the source HTML using parse5 location offsets.
 *
 * For `src="./image.png"` returns the range covering `./image.png`.
 */
const getAttrValueRange = (
  html: string,
  attrLoc: Token.Location,
): { start: number; end: number } | null => {
  const raw = html.slice(attrLoc.startOffset, attrLoc.endOffset);
  const eqIndex = raw.indexOf("=");
  if (eqIndex === -1) return null;

  let start = eqIndex + 1;
  while (start < raw.length && /\s/.test(raw[start] ?? "")) start += 1;

  let end = raw.length;
  const quote = raw[start];
  if (quote === '"' || quote === "'") {
    start += 1;
    end -= 1;
  }

  return {
    start: attrLoc.startOffset + start,
    end: attrLoc.startOffset + end,
  };
};

const shouldProcessMetaContent = (attrs: Map<string, string>): boolean => {
  const name = attrs.get("name")?.trim().toLowerCase();
  if (name && allowedMetaName.has(name)) return true;

  const property = attrs.get("property")?.trim().toLowerCase();
  return property ? allowedMetaProperty.has(property) : false;
};

interface ImageCandidate {
  url: string;
  descriptor: string;
}

const imageCandidateRE =
  /(?:^|\s|(?<=,))(?<url>[\w-]+\([^)]*\)|"[^"]*"|'[^']*'|[^,]\S*[^,])\s*(?:\s(?<descriptor>\w[^,]+))?(?:,|$)/g;
const escapedSpaceCharactersRE = /(?: |\\t|\\n|\\f|\\r)+/g;

// Kept in sync with Vite's loose srcset/image-set parser. It intentionally
// normalizes spacing so generated modules match Vite's own HTML processing.
const parseSrcset = (value: string): ImageCandidate[] =>
  Array.from(
    value
      .trim()
      .replace(escapedSpaceCharactersRE, " ")
      .replace(/\r?\n/, "")
      .replace(/,\s+/, ", ")
      .replaceAll(/\s+/g, " ")
      .matchAll(imageCandidateRE),
    ({ groups }) => ({
      url: groups?.url?.trim() ?? "",
      descriptor: groups?.descriptor?.trim() ?? "",
    }),
  ).filter(({ url }) => url !== "");

const cssUrlRE = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/g;

const walkNodes = (
  nodes: ChildNode[],
  visitor: (node: ChildNode) => void,
): void => {
  for (const node of nodes) {
    visitor(node);
    if ("childNodes" in node) {
      walkNodes(node.childNodes, visitor);
    }
  }
};

export const transformHtmlAssets = (
  html: string,
): { imports: string[]; htmlExpression: string } => {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });

  const imports: string[] = [];
  const replacements: Replacement[] = [];

  const importAsset = (url: string): string => {
    const name = `__typst_asset_${imports.length}`;
    const request = `${url}?url`;
    imports.push(`import ${name} from ${JSON.stringify(request)};`);
    return name;
  };

  const replaceSrc = (start: number, end: number, value: string): void => {
    if (!isAssetUrl(value)) return;
    replacements.push({ start, end, expression: importAsset(value) });
  };

  walkNodes(fragment.childNodes, (node) => {
    if (!isElement(node)) return;

    const tagName = node.tagName.toLowerCase();
    const loc = node.sourceCodeLocation as
      | Token.ElementLocation
      | null
      | undefined;
    if (!loc) return;

    // Check for vite-ignore attribute
    if (node.attrs.some((a: Token.Attribute) => a.name === "vite-ignore"))
      return;

    // Build attribute lookup map
    const attrs = new Map<string, string>(
      node.attrs.map((a: Token.Attribute) => [a.name.toLowerCase(), a.value]),
    );

    // Filter <link> by rel — only process asset-bearing rel values
    if (tagName === "link") {
      const rel = attrs.get("rel")?.toLowerCase().trim();
      if (!rel || !assetLinkRels.has(rel)) return;
    }

    // Determine which src-type attributes to process for this tag
    const srcAttrs = new Set(srcAttributesByTag.get(tagName));
    if (tagName === "meta" && shouldProcessMetaContent(attrs)) {
      srcAttrs.add("content");
    }

    for (const attrName of srcAttrs) {
      const value = attrs.get(attrName);
      if (!value) continue;

      const attrLoc = loc.attrs?.[attrName];
      if (!attrLoc) continue;

      const range = getAttrValueRange(html, attrLoc);
      if (!range) continue;

      replaceSrc(range.start, range.end, value);
    }

    // Process srcset-type attributes (comma-separated URL + descriptor lists)
    for (const attrName of srcsetAttributesByTag.get(tagName) ?? []) {
      const value = attrs.get(attrName);
      if (!value) continue;

      const attrLoc = loc.attrs?.[attrName];
      if (!attrLoc) continue;

      const range = getAttrValueRange(html, attrLoc);
      if (!range) continue;

      const expressions = parseSrcset(value).map((candidate) => {
        if (!isAssetUrl(candidate.url)) {
          return JSON.stringify(
            candidate.url +
              (candidate.descriptor ? ` ${candidate.descriptor}` : ""),
          );
        }

        return [
          importAsset(candidate.url),
          JSON.stringify(
            candidate.descriptor ? ` ${candidate.descriptor}` : "",
          ),
        ].join(" + ");
      });

      replacements.push({
        start: range.start,
        end: range.end,
        expression: expressions.join(' + ", " + '),
      });
    }

    // Process url() references inside inline <style> tags
    if (tagName === "style" && node.childNodes.length > 0) {
      const textNode = node.childNodes[0];
      if (!isTextNode(textNode)) return;

      const textLoc = textNode.sourceCodeLocation;
      if (!textLoc) return;

      const cssText = textNode.value;
      cssUrlRE.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = cssUrlRE.exec(cssText))) {
        const url = match[1] ?? match[2] ?? match[3];
        if (!url || !isAssetUrl(url)) continue;

        // Find the position of the URL value within the full url() match
        const fullMatch = match[0];
        const urlOffset = fullMatch.indexOf(url, 4); // skip past "url("

        replacements.push({
          start: textLoc.startOffset + match.index + urlOffset,
          end: textLoc.startOffset + match.index + urlOffset + url.length,
          expression: importAsset(url),
        });
      }
    }
  });

  // Build the JS expression by interleaving static HTML segments with
  // imported asset variable names.
  replacements.sort((a, b) => a.start - b.start);

  let cursor = 0;
  const parts: string[] = [];
  for (const replacement of replacements) {
    parts.push(JSON.stringify(html.slice(cursor, replacement.start)));
    parts.push(replacement.expression);
    cursor = replacement.end;
  }
  parts.push(JSON.stringify(html.slice(cursor)));

  return {
    imports,
    htmlExpression: parts.filter((part) => part !== '""').join(" + ") || '""',
  };
};
