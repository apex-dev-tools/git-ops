/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import { SimpleGit } from 'simple-git';
import { Git } from '../../src/Git/Git';
import { TempRepoManager } from '../repo-setup/TempRepoManager';

describe('Git', () => {
  const repoManager = TempRepoManager.getInstance('./test/repos');

  beforeEach(async () => {
    await repoManager.init();
  });

  afterEach(async () => {
    await repoManager.tearDown();
  });

  describe('version check', () => {
    it('does not fail when Git version is equal to 2.37.0', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({ major: 2, minor: 37, patch: 0 }),
      } as unknown as SimpleGit;

      await expect(Git.versionCheck(mock)).resolves;
    });
    it('fails when Git major version is lower', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({ major: 1 }),
      } as unknown as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.37.0')
      );
    });

    it('fails when Git minor version is lower', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({ major: 3, minor: 36 }),
      } as unknown as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.37.0')
      );
    });
    it('fails when Git patch version is more than 0', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({ major: 3, minor: 38, patch: 1 }),
      } as unknown as SimpleGit;
      //Then
      await expect(Git.versionCheck(mock)).resolves;
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
        .then(() => repoManager.stageAndCommitAll())
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
        .then(() => repoManager.stageAndCommitAll())
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
        .then(() => repoManager.stageAndCommitAll())
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
        repoManager.createOrUpdateFile('newFile.txt', 'content');
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
        //Setup
        await repoManager
          .createOrUpdateFile('second.txt', 'txt')
          .then(() => repoManager.stageAndCommitAll());

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
          .then(() => repoManager.stageAndCommitAll());
      });
      it('finds diff against for default branch and HEAD', async () => {
        //Given
        await repoManager
          .createOrUpdateFile('anotherFileForCommit.txt', 'text')
          .then(() => repoManager.stageAndCommitAll());

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
          .then(() => repoManager.stageAndCommitAll());

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
