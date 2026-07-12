import { registerBrowserTests } from "./browser.test.ts";

registerBrowserTests("firefox", ["worker", "jspi"]);
