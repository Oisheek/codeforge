export async function getStatus(git) {
  const status = await git.status();

  return {
    clean: status.isClean(),
    staged: status.staged,
    modified: status.modified,
    deleted: status.deleted,
    untracked: status.not_added,
  };
}