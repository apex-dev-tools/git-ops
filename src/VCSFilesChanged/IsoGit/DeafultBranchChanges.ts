import git, { findMergeBase, resolveRef } from 'isomorphic-git';
import fs from 'fs';

const DEFAULT_BRANCH_REF = 'refs/remotes/origin/HEAD';
const HEAD_REF = 'HEAD';

export function getDefaultBranchChanges(
  rootDir: string,
  cache: any
): Promise<Array<string>> {
  return getDiffUpTo(rootDir, DEFAULT_BRANCH_REF, HEAD_REF, cache);
}
/**
 * same as git diff --name-only fromRef...toRef
 * @param rootDir root directory of the repo such rootDir/.git exists
 * @param fromRef string reference
 * @param toRef string reference
 * @returns string of filepaths that are changed
 */
export async function getDiffUpTo(
  rootDir: string,
  fromRef: string,
  toRef: string,
  cache: any
): Promise<Array<string>> {
  const mergeBase = await getMergeBase(rootDir, fromRef, toRef);
  if (mergeBase.length === 0) {
    Promise.reject(
      new Error(`No merge base found between ${fromRef} and ${toRef}`)
    );
  }
  return getFileStateChanges(
    mergeBase[0],
    toRef,
    rootDir,
    cache,
    (path: string) => path.includes('force-app') && path.endsWith('.cls')
  );
}
/**
 * Slightly modified version of https://isomorphic-git.org/docs/en/snippets#git-diff---name-status-commithash1-commithash2
 * Same as `git diff --name-only <commit1> <commit2>`
 * @param oidA Commit Hash 1
 * @param oidB Commit Hash 2
 * @param rootDir root directory of the repo such rootDir/.git exists
 * @param filter filter to decided which filepaths to process
 * @returns
 */
export async function getFileStateChanges(
  oidA: string,
  oidB: string,
  rootDir: string,
  cache: any,
  filter?: (filepath: string) => boolean
): Promise<Array<string>> {
  const changes = new Set<string>();
  const treeA = git.TREE({ ref: oidA });
  const treeB = git.TREE({ ref: oidB });
  return git
    .walk({
      fs,
      dir: rootDir,
      cache,
      trees: [treeA, treeB],
      map: async function (filepath, [A, B]) {
        if (filter && !filter(filepath)) return;
        if ((await A?.type()) === 'tree') return;
        if ((await B?.type()) === 'tree') return;

        Promise.all([A?.oid(), B?.oid()]).then(oids => {
          const [AOid, BOid] = oids;
          if (AOid === undefined && BOid === undefined) {
            console.log('Something weird happened:');
            console.log(A);
            console.log(B);
          }
          if (AOid === BOid) return;

          changes.add(filepath);
        });
      },
    })
    .then(() => [...changes]);
}

export function getMergeBase(
  dir: string,
  refA: string,
  refB: string
): Promise<Array<string>> {
  return Promise.all([
    resolveRef({ fs, dir, ref: refA }),
    resolveRef({ fs, dir, ref: refB }),
  ])
    .then(oids => findMergeBase({ fs, dir, oids }))
    .catch(x => {
      throw Error(`Error finding merge base ${x}`);
    });
}
