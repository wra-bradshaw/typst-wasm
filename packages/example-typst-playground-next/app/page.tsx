import Playground from "../src/Playground";
import { sampleSource } from "../src/sample";
import { compileTypstHtml } from "../src/server-compiler";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initial = await compileTypstHtml(sampleSource);

  return <Playground initial={initial} source={sampleSource} />;
}
