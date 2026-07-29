export async function getRemote(git) {
  const remotes = await git.getRemotes(true);

  const origin = remotes.find((remote) => remote.name === "origin");

  return {
    origin: origin?.refs?.fetch ?? null,
  };
}