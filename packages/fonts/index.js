const fontDefinitions = [
  { file: "NewCMMath-Regular.otf", weight: 400, style: "normal" },
  { file: "NewCMMath-Bold.otf", weight: 700, style: "normal" },
  { file: "NewCMMath-Book.otf", weight: 450, style: "normal" },
];

const loadFontBytes = async (url) => {
  if (url.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(url));
  }

  const response = await fetch(url);
  return new Uint8Array(await response.arrayBuffer());
};

export const newComputerModernMath = fontDefinitions.map((font) => ({
  name: "New Computer Modern Math",
  weight: font.weight,
  style: font.style,
  load: async () => loadFontBytes(new URL(`./dist/files/${font.file}`, import.meta.url)),
}));

export const newComputerModernMathRegular = newComputerModernMath.find((font) => font.weight === 400);
export const newComputerModernMathBold = newComputerModernMath.find((font) => font.weight === 700);
export const newComputerModernMathBook = newComputerModernMath.find((font) => font.weight === 450);

export const defaultFonts = [
  newComputerModernMathRegular,
  newComputerModernMathBold,
  newComputerModernMathBook,
];
