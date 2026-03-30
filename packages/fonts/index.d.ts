export interface Font {
  name: string;
  weight: number;
  style: "normal" | "italic";
  load: () => Promise<Uint8Array>;
}

export declare const newComputerModernMath: Font[];
export declare const newComputerModernMathRegular: Font;
export declare const newComputerModernMathBold: Font;
export declare const newComputerModernMathBook: Font;
export declare const defaultFonts: Font[];
