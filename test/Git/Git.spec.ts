/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import path from 'path';
import { SimpleGit } from 'simple-git';
import { Git } from '../../src/Git/Git';
import { RepoManager } from '../FsUtils/RepoManager';

describe('Git', () => {
  const dir = './test/repos';
  const repoManager = RepoManager.getInstance(dir);

  beforeEach(async () => {
    await repoManager.init();
  });

  afterEach(async () => {
    await repoManager.tearDown();
  });

  describe('version check', () => {
    it('does not fail when Git version is equal to 2.20.0', () => {
      //Given/When
      const mock = ({
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 20,
          patch: 0,
        }),
      } as unknown) as SimpleGit;

      expect(Git.versionCheck(mock)).resolves;
    });

    it('does not fail when Git version is higher', () => {
      //Given/When
      const mock = ({
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 30,
          patch: 2,
        }),
      } as unknown) as SimpleGit;
      //Then
      expect(Git.versionCheck(mock)).resolves;
    });

    it('fails when Git is not installed', async () => {
      //Given/When
      const mock = ({
        version: jest.fn().mockReturnValue({ installed: false }),
      } as unknown) as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('"git" is not installed or available on the PATH')
      );
    });

    it('fails when Git major version is lower', async () => {
      //Given/When
      const mock = ({
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 1,
        }),
      } as unknown) as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.20.0')
      );
    });

    it('fails when Git minor version is lower', async () => {
      //Given/When
      const mock = ({
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 19,
        }),
      } as unknown) as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.20.0')
      );
    });
  });

  describe('rev parse', () => {
    it('get git root', async () => {
      const repoDirPath = path.resolve(repoManager.repoDir);
      const revParse = await new Git(repoManager.repoDir).gitRoot();
      expect(revParse).toBe(repoDirPath);
    });
  });

  describe('branch operation', () => {
    it('fails to find default branch name when head is not set', async () => {
      //Given/When/Then
      await expect(
        new Git(repoManager.repoDir).getDefaultBranchName()
      ).rejects.toThrow(
        Error(
          "Failed to find symbolic ref no remote HEAD with message: 'fatal: ref refs/remotes/origin/HEAD is not a symbolic ref'"
        )
      );
    });

    it('find default branch name when head is set', async () => {
      //Given
      await repoManager
        .createOrUpdateFile('file.txt', 'Test Text')
        .then(() => repoManager.stageAndCommitAll(['file.txt']))
        .then(() => repoManager.push())
        .then(() => repoManager.setHead());

      //When
      const branchName = await new Git(
        repoManager.repoDir
      ).getDefaultBranchName();

      //Then
      expect(branchName).toBe('origin/main');
    });

    it('find default branch name when head is set', async () => {
      //Given
      await repoManager
        .createOrUpdateFile('file.txt', 'Test Text')
        .then(() => repoManager.stageAndCommitAll(['file.txt']))
        .then(() => repoManager.push())
        .then(() => repoManager.setHead());

      //When
      const branchName = await new Git(
        repoManager.repoDir
      ).getDefaultBranchName();

      //Then
      expect(branchName).toBe('origin/main');
    });
  });

  describe('file change operations', () => {
    beforeEach(async () => {
      await repoManager
        .createOrUpdateFile('file.txt', 'text')
        .then(() => repoManager.stageAndCommitAll(['file.txt']))
        .then(() => repoManager.push())
        .then(() => repoManager.setHead());
    });
    describe('local changes', () => {
      it('finds modified files', async () => {
        //Given
        await repoManager.createOrUpdateFile('file.txt', 'modify');
        //When
        const files = await new Git(
          repoManager.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['file.txt']));
      });

      it('finds unstaged renamed files', async () => {
        //Given
        repoManager.renameFileInRepo('file.txt', 'renamed.txt');
        // await repoManager.gitStage();
        //When
        const files = await new Git(
          repoManager.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['renamed.txt']));
      });

      it('finds unstaged new files', async () => {
        //Given
        await repoManager.createOrUpdateFile('newFile.txt', 'content');
        //When
        const files = await new Git(
          repoManager.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['newFile.txt']));
      });

      it('does not include deleted files', async () => {
        //Given
        repoManager.rmFile('file.txt');
        //When
        const files = await new Git(
          repoManager.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set());
      });

      it('finds staged renamed, modified and new files ', async () => {
        //Setup for renamed file
        await repoManager
          .createOrUpdateFile('second.txt', 'txt')
          .then(() => repoManager.stageAndCommitAll(['second.txt']));

        //Given
        await repoManager
          .createOrUpdateFile('file.txt', 'modifiy')
          .then(() => repoManager.renameFileInRepo('second.txt', 'renamed.txt'))
          .then(() => repoManager.createOrUpdateFile('newFile.txt', 'content'))
          .then(() => repoManager.stageAll());

        //When
        const files = await new Git(
          repoManager.repoDir
        ).getLocalChangedAndCreated();

        //Then
        expect(files).toEqual(
          new Set(['file.txt', 'renamed.txt', 'newFile.txt'])
        );
      });
    });

    describe('branch diff changes', () => {
      beforeEach(async () => {
        await repoManager
          .checkout('dev', 'main')
          .then(() => repoManager.createOrUpdateFile('newFile.txt', 'text'))
          .then(() => repoManager.stageAndCommitAll(['newFile.txt']));
      });
      it('finds diff against for default branch and HEAD', async () => {
        //Given
        await repoManager
          .createOrUpdateFile('anotherFileForCommit.txt', 'text')
          .then(() =>
            repoManager.stageAndCommitAll(['anotherFileForCommit.txt'])
          );

        //When
        const files = await new Git(repoManager.repoDir).diffRange(
          'origin/main',
          'HEAD'
        );

        //Then
        expect(files).toEqual(
          new Set(['newFile.txt', 'anotherFileForCommit.txt'])
        );
      });

      it('finds diff against default branch and commit ref', async () => {
        //Given
        const currentRef = (await repoManager.getGitLog())[0].hash;

        await repoManager
          .createOrUpdateFile('anotherFileForCommit.txt', 'text')
          .then(() =>
            repoManager.stageAndCommitAll(['anotherFileForCommit.txt'])
          );

        //When
        const files = await new Git(repoManager.repoDir).diffRange(
          'origin/main',
          currentRef
        );

        //Then
        expect(files).toEqual(new Set(['newFile.txt']));
      });
    });
  });
});
