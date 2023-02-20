# git-ops

Library to do git operations to find changed files in a given git repository.

## Getting Started

To build run

```bash
pnpm install
pnpm build
```

Jest unit tests can be run with

```bash
pnpm test
```

##  Usage

**Prerequisite**: The head mus tbe set on the repo otherwise any functions using default branch will fail

### Finding changed files

Getting changed files using the default branch in that repo given a ref. This find the default branch ion the repo using `git symbolic-ref 'refs/remotes/origin/HEAD'` so the `HEAD` must be set.
The output of the command is same as running `git diff branchName...ref` combined with `git status`.

**Note:** files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set.

```TypeScript
getDefaultBranchDiffByRef(repoRootDir: string, ref: string): Promise<Set<string>>
```

Getting changed files using the default branch in that repo.

This command is same as calling `getDefaultBranchDiffByRef(repoRootDir, 'HEAD')`.

```TypeScript
getDefaultBranchDiff(repoRootDir: string): Promise<Set<string>>
```
