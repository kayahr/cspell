import { glob, readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import esbuild from "esbuild";
import esbuildPluginLicense from "esbuild-plugin-license";

const outdir = "lib";
const outfile = join(outdir, "cspell.js");

function describeAuthor(author) {
    if (author instanceof Object) {
        let description = `Author: ${author.name}`;
        if (author.email != null) {
            description += ` <${author.email}>`;
        }
        return description;
    }
    return null;
}

// Bundle cspell
await esbuild.build({
    entryPoints: [ "./node_modules/cspell/bin.mjs" ],
    outfile,
    platform: "node",
    target: "node20",
    format: "esm",
    bundle: true,
    minify: true,
    banner: {
        js: `import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);`
    },
    plugins: [
        esbuildPluginLicense({
            thirdParty: {
                output: {
                    file: 'lib/LICENSE-THIRD-PARTY.txt',
                    // Template function that can be defined to customize report output
                    template(dependencies) {
                        return [
                            "This file lists third-party dependencies bundled with this package, along with their license information.",
                            ...dependencies.map((dependency) => [
                                `${dependency.packageJson.name} v${dependency.packageJson.version}`,
                                describeAuthor(dependency.packageJson.author),
                                `License: ${dependency.packageJson.license}`,
                                "",
                                dependency.licenseText.trim() || "(No LICENSE file found)",
                            ].filter(a => a != null).join("\n"))
                        ].join("\n\n-----\n\n");
                    }
                }
            }
       })
    ]
});

async function replace(file, search, replace) {
    await writeFile(file, (await readFile(file, "utf-8")).replaceAll(search, replace), { encoding: "utf-8" });
}

// Change default config filename
await replace(outfile, "@cspell/cspell-bundled-dicts/cspell-default.json", "cspell-default.json");

// Copy config files
const dictDir = resolve("node_modules/@cspell");
const exclude =[ "**/LICENSE*", "**/README*", "**/package.json" ];
const copy = async (pattern, cwd) => {
    for await (const file of glob(pattern, { cwd, exclude, withFileTypes: true })) {
        if (file.isFile()) {
            const sourceFile = join(file.parentPath, file.name);
            const targetFile = join(outdir, relative(cwd, sourceFile));
            await mkdir(dirname(targetFile), { recursive: true });
            await copyFile(sourceFile, targetFile);
        }
    }
}
await copy("dict-*/**", dictDir);
await copy("**", join(dictDir, "cspell-bundled-dicts"));

// Fix import paths in default config
await replace(join(outdir, "cspell-default.config.js"), "'@cspell/dict-", "'./dict-");

// Fix import paths dictionaries
for await (const file of glob(`${outdir}/dict-*/cspell-ext.json`)) {
    await replace(file, /"@cspell\/([^"]+)"/g, '"../$1/cspell-ext.json"');
}
