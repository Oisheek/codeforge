import simpleGit from "simple-git";

import { getBranch } from "./branch.js";
import { getStatus } from "./status.js";
import { getRemote } from "./remote.js";
import { getLastCommit } from "./commit.js";
import { getDiff, getStagedDiff } from "./diff.js";

export async function inspectGit(root) {
  const git = simpleGit(root);

  const isRepository = await git.checkIsRepo();

  if (!isRepository) {
    return {
      isRepository: false,
      branch: null,
      status: null,
      remote: null,
      lastCommit: null,
      diff: null,
      stagedDiff: null,
    };
  }

  return {
    isRepository: true,
    branch: await getBranch(git),
    status: await getStatus(git),
    remote: await getRemote(git),
    lastCommit: await getLastCommit(git),
    diff: await getDiff(git),
    stagedDiff: await getStagedDiff(git),
  };
}