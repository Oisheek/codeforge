export async function getLastCommit(git) {
  const log = await git.log({ maxCount: 1 });

  if (log.total === 0) {
    return null;
  }

  const commit = log.latest;

  return {
    hash: commit.hash,
    author: commit.author_name,
    message: commit.message,
    date: commit.date,
  };
}
