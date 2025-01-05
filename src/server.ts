import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { DenoRegistry } from "@dntpm/config.ts";
import { PackageLookup, PackageVersion } from "@dntpm/types.ts";
import { build } from "@dntpm/build.ts";
import { getFileHash } from "@dntpm/utils.ts";
// import Builder from "@dntpm/builder.ts";

interface ServerInitParmams {
  denoRegistry: DenoRegistry;
}

export default class Server {
  private denoRegistry: DenoRegistry;

  constructor(params: ServerInitParmams) {
    this.denoRegistry = params.denoRegistry;
  }

  public getRouter = () => {
    const router = new Router();

    /**
     * Meta Endpoint: GET /
     * Responds with registry metadata information.
     */
    router.get("/", (ctx) => {
      ctx.response.body = {
        db_name: "dntpm", // Name of the database
        doc_count: 0, // Number of documents in the database
        doc_del_count: 0, // Number of deleted documents
        update_seq: 0, // Current sequence number of updates
        purge_seq: 0, // Count of purged documents
        compact_running: false, // Indicates if compaction is in progress
        disk_size: 0, // Total size of the database on disk in bytes
        data_size: 0, // Size of the actual data stored
        instance_start_time: "0", // Timestamp when the instance started
        disk_format_version: 6, // Version of the database file format
        committed_update_seq: 0, // Last committed sequence number of updates
      };
    });

    /**
     * Package Endpoint: GET /{package}
     * Responds with metadata for a specific package.
     * @param {string} package - Name of the package
     */
    router.get("/:packageName", async (ctx) => {
      const { packageName } = ctx.params;
      const packageMeta = await this.denoRegistry.getPackageMeta(packageName);

      // Get hashes of the package
      const { packageBuild, packageJson } = await build(this.denoRegistry, packageName);
      const sha1Hash = await getFileHash(packageBuild, "SHA-1");
      const sha512Hash = await getFileHash(packageBuild, "SHA-512");

      // Serialize the package information
      const version: PackageVersion = {
        name: packageName,
        version: packageMeta.version,
        description: packageMeta.description,
        author: packageMeta.author,
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        dist: [{
          shasum: sha1Hash,
          integrity: sha512Hash,
          tarball: `${Deno.env.get("SERVER_URL")!}${/build/}packageBuild`,
        }],
      };
      const versions: { [version: string]: PackageVersion } = {};
      versions[packageMeta.version] = version;
      const packageLookup: PackageLookup = {
        description: packageMeta.description,
        versions,
      };

      // Return the serialized package information
      ctx.response.body = packageLookup;
    });

    /**
     * Search Endpoint: GET /-/v1/search
     * Responds with search results for packages.
     * @param {URLSearchParams} queryParams - Query parameters for search
     */
    router.get("/-/v1/search", (ctx) => {
      const queryParams = ctx.request.url.searchParams;
      ctx.response.body = `Search results with parameters: ${queryParams}`;
    });

    return router;
  };

  /**
   * Get the oak app.
   */
  public getApp = () => {
    const router = this.getRouter();

    // Set up the dntpm applet
    const app = new Application();

    // Add logging middleware
    app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
      console.log("Request: ", ctx.request);
    });

    // Set up the app
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Return the app
    return app;
  };
}
