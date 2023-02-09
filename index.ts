import { getDefaultBranchChanges } from './src/VCSFilesChanged/IsoGit/DeafultBranchChanges';
import { getLocalChanges } from './src/VCSFilesChanged/IsoGit/LocalChanges';
import { argv } from 'node:process';

function main() {
  let cache = {};
  if (argv.length < 3) {
    console.log('Pass dir as argument');
    return;
  }
  const dir = argv[2];

  console.time('GettingChanges');
  Promise.all([
    getLocalChanges(dir, cache),
    getDefaultBranchChanges(dir, cache),
  ]).then(res => {
    console.timeEnd('GettingChanges');
    console.log(res.flat());
  });
}

main();
