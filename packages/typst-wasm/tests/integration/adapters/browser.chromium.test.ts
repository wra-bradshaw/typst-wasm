import { registerBrowserTests } from "./browser.test.ts";

registerBrowserTests("chromium", ["worker", "jspi"]);
