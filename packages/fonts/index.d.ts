export interface FontDescriptor {
  id: string;
  name: string;
  filename: string;
  weight: number;
  style: "normal" | "italic";
}

export interface FontCompiler {
  addFont(data: Uint8Array): Promise<void>;
}

export type FontBytes = ArrayBuffer | Uint8Array;
export type FontBytesLoader = (font: FontDescriptor) => Promise<FontBytes>;

export declare const newComputerModernMath: FontDescriptor[];
export declare const newComputerModernMathRegular: FontDescriptor;
export declare const newComputerModernMathBold: FontDescriptor;
export declare const newComputerModernMathBook: FontDescriptor;
export declare const defaultFonts: FontDescriptor[];
export declare const loadDefaultFonts: (
  compiler: FontCompiler,
  loadFontBytes: FontBytesLoader,
) => Promise<void>;
