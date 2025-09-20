import { describe, it } from "node:test";
import assert from "node:assert";
import packageJSON from "../package.json" with { type: "json" };

describe("version", () => {
    it("matches upstream version", () => {
        const cspellVersion = packageJSON.devDependencies["cspell"];
        const bundleVersion = packageJSON.version;
        assert(bundleVersion.startsWith(`${cspellVersion}-bundle.`));
    });
});
