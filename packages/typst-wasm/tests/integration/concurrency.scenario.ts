import {
  assert,
  makeCompiler,
  assertSvgPage,
  type IntegrationScenarioOptions,
} from "./harness.ts";

const source = (label: string): string =>
  `#set page(width: auto, height: auto, margin: 10pt)\n= ${label}`;

/** Exercises operations that must remain independent while workers are busy. */
export const runConcurrencyScenario = async (
  options: IntegrationScenarioOptions,
): Promise<void> => {
  const first = await makeCompiler(options);
  const second = await makeCompiler(options);
  try {
    await Promise.all([
      first.addSource("first.typ", source("First compiler")),
      second.addSource("second.typ", source("Second compiler")),
    ]);

    const [firstResult, secondResult] = await Promise.all([
      first.compile({ main: "first.typ", format: "svg" }),
      second.compile({ main: "second.typ", format: "svg" }),
    ]);
    assertSvgPage(
      firstResult,
      options.runtime,
      "concurrent first compile",
    );
    assertSvgPage(
      secondResult,
      options.runtime,
      "concurrent second compile",
    );

    await Promise.all([
      first.addSource("a.typ", source("A")),
      first.addSource("b.typ", source("B")),
    ]);
    const files = await first.listFiles();
    assert(
      files.includes("a.typ") && files.includes("b.typ"),
      `[${options.runtime}] concurrent file mutations were lost`,
    );
    assert(
      !(await second.hasFile("a.typ")),
      `[${options.runtime}] compiler file state leaked between instances`,
    );

    if (options.fetch) {
      const packageSource = `#import "@preview/wordometer:0.1.5": word-count-of\n#set page(width: auto, height: auto, margin: 10pt)\n= Concurrent package\n#word-count-of[Hello world]`;
      await Promise.all([
        first.addSource("package-one.typ", packageSource),
        second.addSource("package-two.typ", packageSource),
      ]);
      const [packageOne, packageTwo] = await Promise.all([
        first.compile({ main: "package-one.typ", format: "svg" }),
        second.compile({ main: "package-two.typ", format: "svg" }),
      ]);
      assertSvgPage(
        packageOne,
        options.runtime,
        "first simultaneous package import",
      );
      assertSvgPage(
        packageTwo,
        options.runtime,
        "second simultaneous package import",
      );
    }
  } finally {
    await Promise.allSettled([first.dispose(), second.dispose()]);
  }
};
