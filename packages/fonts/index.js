const fontDefinitions = [
  {
    id: "new-computer-modern-math-regular",
    file: "NewCMMath-Regular.otf",
    weight: 400,
    style: "normal",
  },
  {
    id: "new-computer-modern-math-bold",
    file: "NewCMMath-Bold.otf",
    weight: 700,
    style: "normal",
  },
  {
    id: "new-computer-modern-math-book",
    file: "NewCMMath-Book.otf",
    weight: 450,
    style: "normal",
  },
];

export const newComputerModernMath = fontDefinitions.map((font) => ({
  id: font.id,
  name: "New Computer Modern Math",
  filename: font.file,
  weight: font.weight,
  style: font.style,
}));

export const newComputerModernMathRegular = newComputerModernMath.find(
  (font) => font.weight === 400,
);
export const newComputerModernMathBold = newComputerModernMath.find(
  (font) => font.weight === 700,
);
export const newComputerModernMathBook = newComputerModernMath.find(
  (font) => font.weight === 450,
);

export const defaultFonts = [
  newComputerModernMathRegular,
  newComputerModernMathBold,
  newComputerModernMathBook,
];

export const loadDefaultFonts = async (compiler, loadFontBytes) => {
  for (const font of defaultFonts) {
    const bytes = await loadFontBytes(font);
    await compiler.addFont(
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
    );
  }
};
