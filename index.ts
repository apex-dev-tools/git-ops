import { getDefaultBranchDiff } from './src/FilesChanged/BranchChanges';
import { argv } from 'node:process';

function main() {
  if (argv.length < 3) {
    console.log('Pass dir as argument');
    return;
  }
  const dir = argv[2];

  console.time('GettingChanges');
  getDefaultBranchDiff(dir).then(res => {
    console.timeEnd('GettingChanges');
    console.log(res);
  });
}

main();
