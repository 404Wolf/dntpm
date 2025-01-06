import { DntpmConfig } from "@dntpm/config.ts";
import { build } from "@dntpm/build.ts";

export function serve(dntpmConfig: DntpmConfig) {
  Deno.serve({
    port: 8000,
    hostname: "0.0.0.0",
    handler: async (req) => {
      const re = /https?:\/\/[^/]+\/(?<url>.*)/;
      const match = req.url.match(re);
      if (!match || !match.groups) {
        throw new Error("Could not find Deno URL in URL");
      }
      const url = match.groups.url;

      const packageBuild = await build(dntpmConfig, url);
      console.log("Package build output", packageBuild);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const packageStream = await Deno.open(packageBuild, { read: true });
      return new Response(packageStream.readable);
    },
  });
}
