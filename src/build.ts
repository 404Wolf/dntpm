import type { DenoRegistry } from "@dntpm/config.ts";
import { create } from "npm:tar";
import { build as dntBuild, PackageJson } from "@deno/dnt";
import * as path from "jsr:@std/path@1";

interface PackageBuild {
  packageJson: PackageJson;
  packageBuild: string;
}

export async function build(
  denoRegistry: DenoRegistry,
  packageName: string,
): Promise<PackageBuild> {
  console.log("Building package", packageName);
  const sanitizePackageName = packageName.replace("/", "_").replace("@", "-");

  // Options for creation of temp files naming
  const tempFileOptions = (task: string): Deno.MakeTempOptions => ({
    prefix: `${denoRegistry.name}_${sanitizePackageName}`,
    suffix: `_${task}`,
    dir: "builds",
  });

  // Download the entrypoint to the deno module
  const entrypoint = await Deno.makeTempFile(tempFileOptions("entrypoint"));
  const denoUrl = await denoRegistry.getPackageDenoUrl(packageName);
  const stream = (await Deno.create(entrypoint)).writable;
  const resp = await fetch(denoUrl);
  if (!resp.body) {
    throw new Error("Response body is empty.");
  }
  resp.body.pipeTo(stream);

  // Get the package metadata
  const packageMeta = await denoRegistry.getPackageMeta(packageName);
  console.log("Package meta", packageMeta);

  // Create a directory for the output build
  const buildDir = await Deno.makeTempDir(tempFileOptions("build"));

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

  // Read and return the contents of the package json
  const packageJson = JSON.parse(
    await Deno.readTextFile(path.join(buildDir, "package.json")),
  ) as PackageJson;
  console.log("Package json", packageJson);

  // Tar the build
  const tempFile = await Deno.makeTempFile(tempFileOptions("tar"));
  create(
    { gzip: true, file: tempFile },
    [buildDir],
  );
  console.log("Created tar file at", tempFile);

  // Return the package build
  return {
    packageJson,
    packageBuild: tempFile,
  };
}
