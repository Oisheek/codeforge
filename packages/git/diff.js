export async function getDiff(git) {
  const diff = await git.diff();

  return {
    diff,
  };
}

export async function getStagedDiff(git) {
  const diff = await git.diff(["--cached"]);

  return {
    diff,
  };
}