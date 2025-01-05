export async function getFileHash(file: string, algo: string) {
  const buildData = await Deno.readFile(file);
  const hashBuffer = await crypto.subtle.digest(algo, buildData);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}
