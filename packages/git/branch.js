export async function getBranch(git) {
  const branch = await git.branch();

  return {
    current: branch.current,
  };
}