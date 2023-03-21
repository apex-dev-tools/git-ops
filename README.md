# git-ops

Library to do git operations to find changed files in a given git repository.

## Prerequisite

Minimum `git` version of `2.30.0` must already be installed on the host machine.

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

### Installation

```shell
npm i @apexdevtools/git-ops
```

### Finding changed files

Getting changed files using the default branch in that repo given a ref. This finds the default branch in the repo using `git symbolic-ref 'refs/remotes/origin/HEAD'` so the `HEAD` must be set.
The output of the command is same as running `git diff branchName...ref` combined with `git status`.

**Note:** files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set.

### `getDefaultBranchDiffByRef`

Works out changed files using the default branch in that repo given a ref.
This find the default branch in the repo using `git symbolic-ref 'refs/remotes/origin/HEAD'`
so the `HEAD` must be set. The output of the command is same as running `git diff branchName...ref` combined with `git status`.

Files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set.

```TypeScript
getDefaultBranchDiffByRef(repoDir: string, ref: string): Promise<Set<string>>
```

### `getDefaultBranchDiff`

This command is same as calling `getDefaultBranchDiffByRef(repoRootDir, 'HEAD')`.

```TypeScript
getDefaultBranchDiff(repoDir: string): Promise<Set<string>>
```

### `getDiffRange`

Works out the diff between a given range. Equivalent to `git diff ref1...ref2`

```Typescript
getDiffRange(dir: string, fromRef: string, toRef: string): Promise<Set<string>>
```

### `getLocalChanges`

Get the local changes that not have been committed. Equivalent to `git status`

Files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set

```TypeScript
getLocalChanges(dir: string): Promise<Set<string>>
```
