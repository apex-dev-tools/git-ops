import git, { statusMatrix } from 'isomorphic-git';
import fs from 'fs';

const FILE = 0,
  HEAD = 1,
  WORKDIR = 2,
  STAGE = 3;

export async function getLocalChanges(dir: string, cache: any) {
  return await statusMatrix({
    fs,
    dir,
    cache,
    filter: filepath =>
      filepath.includes('force-app') && filepath.endsWith('cls'),
  }).then(rows => {
    return rows
      .filter(
        row => !(row[HEAD] === row[WORKDIR] && row[WORKDIR] === row[STAGE])
      )
      .map(row => row[FILE]);
  });
}
