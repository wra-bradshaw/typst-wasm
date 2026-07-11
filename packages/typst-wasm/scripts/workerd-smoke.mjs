import { Miniflare } from "miniflare";

const miniflare = new Miniflare({
  modules: true,
  script: 'export default { fetch() { return new Response("workerd ok"); } };',
  modulesRules: [
    { type: "ESModule", include: ["**/*.js"] },
    { type: "CompiledWasm", include: ["**/*.wasm"] },
  ],
  compatibilityFlags: ["nodejs_compat"],
});
try {
  const response = await miniflare.dispatchFetch("http://localhost/");
  if (!response.ok) {
    throw new Error(`Workerd request failed with HTTP ${response.status}`);
  }
  console.log(`runtime=workerd backend=workerd-module status=${response.status}`);
} finally {
  await miniflare.dispose();
}
