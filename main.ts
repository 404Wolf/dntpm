import ValTown from "npm:@valtown/sdk";
import { DntpmConfig } from "@dntpm/config.ts";
import { serve } from "@dntpm/server.ts";
import "@std/dotenv/load";

const valtown = new ValTown({ bearerToken: Deno.env.get("VAL_TOWN_API_KEY") });

/**
 * Take a bare package reference like @wolf/foobar and convert it into a val
 * town val object for the module https://esm.town/v/wolf/foobar.
 */
async function barePackageToVal(packageName: string) {
  const FailedToDestructure = new Error("Unable to destruct package name");

  const re = /@(?<user>.*)\/(?<val>.*)/;
  const match = re.exec(packageName);
  if (!match) {
    throw FailedToDestructure;
  }
  const user = match.groups?.user;

  const val = match.groups?.val;
  if (!user || !val) {
    throw FailedToDestructure;
  }

  const vals = await valtown.search.vals.list({ query: `${user}/${val}` });
  if (vals.data.length === 0) {
    throw new Error("Val not found");
  }
  const basicVal = vals.data[0];
  const extendedVal = await valtown.vals.retrieve(basicVal.id);
  return extendedVal;
}

const baseUrl = "https://esm.town/v";
const dntpmConfig: DntpmConfig = {
  getPackageMeta: async (packageName: string) => {
    const val = await barePackageToVal(packageName);
    return {
      name: val.name,
      version: `v${val.version}`,
      author: {
        name: val.author!.username!,
        url: `https://val.town/v/${val.author!.username}`,
      },
      description: val.readme || "",
      license: "n/a",
      repository: {
        url: val.links.self,
        type: "valtown",
      },
    };
  },
  getPackageDenoUrl: (packageName: string) => {
    const re = /@(.*)\/(.*)/;

    const match = packageName.match(re);
    if (match === null) {
      throw new Error("Invalid Deno url");
    }

    const username = match[1];
    const valName = match[2];

    return `${baseUrl}/${username}/${valName}`;
  },
};

serve(dntpmConfig);
