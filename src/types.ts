import { PackageJson } from "@deno/dnt";

export interface PackageMaintainer {
  name: string;
  email: string;
}

export interface PackageDistribution {
  shasum: string;
  tarball: string; // Url to the tarball
  integrity: string;
  signatures?: {
    keyid: string;
    sig: string;
  }[];
}

export interface PackageVersion extends PackageJson {
  _id?: string; // package@version
  _shasum?: string; // sha1 of the tarball
  _from?: string; // "."
  _npmVersion?: string; // npm version
  _nodeVersion?: string; // node version
  _npmUser?: {
    name: string;
    email: string;
  };
  maintainers?: { name: string; email: string }[];
  dist: PackageDistribution[];
}

export interface PackageLookup {
  _id?: string;
  _rev?: string;
  description: string;
  "dist-tags"?: string;
  versions: { [packageVersion: string]: PackageVersion };
}
