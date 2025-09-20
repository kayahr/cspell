import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { mkdtemp, cp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const tmpPrefix = join(tmpdir(), "@kayahr-cspell-");

describe("cspell", () => {
    let tmpDir;

    beforeEach(async () => {
        // Create temporary working directory
        tmpDir = await mkdtemp(tmpPrefix);

        // Copy cspell bundle into bin directory
        const binDir = join(tmpDir, "bin");
        await mkdir(binDir);
        await cp("lib", binDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true });
    });

    it("correctly checks a file without errors", async () => {
        await writeFile(join(tmpDir, "test.txt"), "This file contains some valid english text.");
        const { stdout, stderr } = await execAsync("node bin/cspell.js test.txt", { cwd: tmpDir });
        assert.equal(stdout, "");
        assert.match(stderr, /^1\/1 test\.txt [0-9]+.[0-9]+ms\nCSpell: Files checked: 1, Issues found: 0 in 0 files.\n$/);
    });

    it("correctly checks a file with errors", async () => {
        await writeFile(join(tmpDir, "test.txt"), "This file contains an" + "error");
        try {
            await execAsync("node bin/cspell.js test.txt", { cwd: tmpDir });
            assert.fail("Expected to throw error");
        } catch (error) {
            assert.equal(error.code, 1);
            assert.equal(error.stdout, "test.txt:1:20 - Unknown word (an" + "error)\n");
            assert.match(error.stderr, /^1\/1 test\.txt [0-9]+.[0-9]+ms X\nCSpell: Files checked: 1, Issues found: 1 in 1 file.\n$/);
        }
    });

    it("correctly outputs help", async () => {
        const { stdout, stderr } = await execAsync("node bin/cspell.js --help", { cwd: tmpDir });
        assert.equal(stderr, "");
        assert.match(stdout, /^Usage: cspell .*/);
    });
});
