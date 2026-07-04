declare module "*.wasm" {
  const url: string;
  export default url;
}

declare module "*.otf" {
  const url: string;
  export default url;
}

declare module "*?url" {
  const url: string;
  export default url;
}
