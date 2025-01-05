/**
 * A DenoRegistry contains the config necessary to go from a npm bare import,
 * like @wolf/foobar, to a Deno module URL, like
 * https://esm.town/v/wolf/foobar, and retrieve metadata. It also contains some
 * metadata about the registry itself.
 */
export interface DenoRegistry {
  /**
   * The name of the registry.
   */
  name: string;

  /**
   * Take a bare reference for an npm package and convert it to a deno URL
   * package reference.
   */
  getPackageDenoUrl: (packageName: string) => Promise<string> | string;

  /**
   * Get metadata for a specific package, based on the name of the package.
   */
  getPackageMeta: (packageName: string) => Promise<PackageMeta> | PackageMeta;
}

/**
 * Metadata for a deno package. The DenoRegistry provides the logic necessary
 * to create this given a bare name of a package. This is all propagated to the
 * `package.json`.
 */
export interface PackageMeta {
  name: string;
  author: { name: string; url: string };
  version: string;
  description: string;
  license: string;
  repository: {
    type: string;
    url: string;
  };
  readme?: string;
}
