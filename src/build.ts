import type { DntpmConfig } from "@dntpm/config.ts";
import { create } from "npm:tar";
import { build as dntBuild } from "@deno/dnt";

export async function build(
  denoRegistry: DntpmConfig,
  packageName: string,
) {
  console.log("Building package", packageName);
  const sanitizePackageName = packageName.replace("/", "_").replace("@", "");

  // Options for creation of temp files naming
  const tempFileOptions = (task: string): Deno.MakeTempOptions => ({
    prefix: `dntpm_${sanitizePackageName}`,
    suffix: `_${task}`,
    dir: "builds",
  });

  // Download the entrypoint to the deno module
  const entrypoint = await Deno.makeTempFile(tempFileOptions("entrypoint"));
  console.log("Build target entrypoint", entrypoint);
  const denoUrl = await denoRegistry.getPackageDenoUrl(packageName);
  console.log("Package deno url", denoUrl);
  const stream = (await Deno.create(entrypoint)).writable;
  const resp = await fetch(denoUrl);
  if (!resp.body) {
    throw new Error("Response body is empty.");
  }
  resp.body.pipeTo(stream);

  // Get the package metadata
  const packageMeta = await denoRegistry.getPackageMeta(packageName);
  console.log("Retreived package metadata", packageMeta);

  // Create a directory for the output build
  const buildDir = await Deno.makeTempDir(tempFileOptions("build"));
  console.log("Performing npm package build", buildDir);

  // Run the builder to create the package
  await dntBuild({
    entryPoints: [entrypoint],
    outDir: buildDir,
    shims: { deno: true },
    package: packageMeta,
    postBuild() {
      if (packageMeta.readme) {
        Deno.writeTextFile(`${buildDir}/README.md`, packageMeta.readme);
      }
    },
  });
  console.log("Finished with package build");

  // Tar the buildDir
  const tempFile = await Deno.makeTempFile(tempFileOptions("tar"));
  await create(
    { gzip: true, file: tempFile, cwd: buildDir },
    ["."],
  );
  console.log("Tared package build at", tempFile);

  // Return the package build
  return tempFile;
}
