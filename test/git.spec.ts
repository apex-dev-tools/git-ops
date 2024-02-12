/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import path from 'path';
import { SimpleGit } from 'simple-git';
import { Git } from '../src';
import { RepoHelper } from './helpers/repo';

describe('Git', () => {
  const dir = './test/repos';
  const repoHelper = RepoHelper.getInstance(dir);

  beforeEach(async () => {
    await repoHelper.init();
  });

  afterEach(() => {
    repoHelper.tearDown();
  });

  describe('version check', () => {
    it('does not fail when Git version is equal to 2.20.0', () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 20,
          patch: 0,
        }),
      } as unknown as SimpleGit;

      expect(Git.versionCheck(mock)).resolves;
    });

    it('does not fail when Git version is higher', () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 30,
          patch: 2,
        }),
      } as unknown as SimpleGit;
      //Then
      expect(Git.versionCheck(mock)).resolves;
    });

    it('fails when Git is not installed', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({ installed: false }),
      } as unknown as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('"git" is not installed or available on the PATH')
      );
    });

    it('fails when Git major version is lower', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 1,
        }),
      } as unknown as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.20')
      );
    });

    it('fails when Git minor version is lower', async () => {
      //Given/When
      const mock = {
        version: jest.fn().mockReturnValue({
          installed: true,
          major: 2,
          minor: 19,
        }),
      } as unknown as SimpleGit;

      //Then
      await expect(Git.versionCheck(mock)).rejects.toThrow(
        Error('Unsupported version of git. Min version must be 2.20')
      );
    });
  });

  describe('rev parse', () => {
    it('get git root', async () => {
      const repoDirPath = path.resolve(repoHelper.repoDir);
      const revParse = await new Git(repoHelper.repoDir).gitRoot();
      expect(revParse).toBe(repoDirPath);
    });
  });

  describe('branch operation', () => {
    it('fails to find default branch name when head is not set', async () => {
      //Given/When/Then
      await expect(
        new Git(repoHelper.repoDir).getDefaultBranchName()
      ).rejects.toThrow(
        Error(
          "Failed to find symbolic ref no remote HEAD with message: 'fatal: ref refs/remotes/origin/HEAD is not a symbolic ref'"
        )
      );
    });

    it('find default branch name when head is set', async () => {
      //Given
      repoHelper.createOrUpdateFile('file.txt', 'Test Text');

      await repoHelper
        .stageAndCommitAll(['file.txt'])
        .then(() => repoHelper.push())
        .then(() => repoHelper.setHead());

      //When
      const branchName = await new Git(
        repoHelper.repoDir
      ).getDefaultBranchName();

      //Then
      expect(branchName).toBe('origin/main');
    });

    it('find default branch name when head is set', async () => {
      //Given
      repoHelper.createOrUpdateFile('file.txt', 'Test Text');

      await repoHelper
        .stageAndCommitAll(['file.txt'])
        .then(() => repoHelper.push())
        .then(() => repoHelper.setHead());

      //When
      const branchName = await new Git(
        repoHelper.repoDir
      ).getDefaultBranchName();

      //Then
      expect(branchName).toBe('origin/main');
    });
  });

  describe('file change operations', () => {
    beforeEach(async () => {
      repoHelper.createOrUpdateFile('file.txt', 'text');

      await repoHelper
        .stageAndCommitAll(['file.txt'])
        .then(() => repoHelper.push())
        .then(() => repoHelper.setHead());
    });
    describe('local changes', () => {
      it('finds modified files', async () => {
        //Given
        repoHelper.createOrUpdateFile('file.txt', 'modify');
        //When
        const files = await new Git(
          repoHelper.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['file.txt']));
      });

      it('finds unstaged renamed files', async () => {
        //Given
        repoHelper.renameFileInRepo('file.txt', 'renamed.txt');
        // await repoHelper.gitStage();
        //When
        const files = await new Git(
          repoHelper.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['renamed.txt']));
      });

      it('finds unstaged new files', async () => {
        //Given
        repoHelper.createOrUpdateFile('newFile.txt', 'content');
        //When
        const files = await new Git(
          repoHelper.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set(['newFile.txt']));
      });

      it('does not include deleted files', async () => {
        //Given
        repoHelper.rmFile('file.txt');
        //When
        const files = await new Git(
          repoHelper.repoDir
        ).getLocalChangedAndCreated();
        //Then
        expect(files).toEqual(new Set());
      });

      it('finds staged renamed, modified and new files ', async () => {
        //Setup for renamed file
        repoHelper.createOrUpdateFile('second.txt', 'txt');
        await repoHelper.stageAndCommitAll(['second.txt']);

        //Given
        repoHelper.createOrUpdateFile('file.txt', 'modifiy');
        repoHelper.renameFileInRepo('second.txt', 'renamed.txt');
        repoHelper.createOrUpdateFile('newFile.txt', 'content');

        await repoHelper.stageAll();

        //When
        const files = await new Git(
          repoHelper.repoDir
        ).getLocalChangedAndCreated();

        //Then
        expect(files).toEqual(
          new Set(['file.txt', 'renamed.txt', 'newFile.txt'])
        );
      });
    });

    describe('branch diff changes', () => {
      beforeEach(async () => {
        await repoHelper
          .checkout('dev', 'main')
          .then(() => repoHelper.createOrUpdateFile('newFile.txt', 'text'))
          .then(() => repoHelper.stageAndCommitAll(['newFile.txt']));
      });
      it('finds diff against for default branch and HEAD', async () => {
        //Given
        repoHelper.createOrUpdateFile('anotherFileForCommit.txt', 'text');

        await repoHelper.stageAndCommitAll(['anotherFileForCommit.txt']);

        //When
        const files = await new Git(repoHelper.repoDir).diffRange(
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
        const currentRef = (await repoHelper.getGitLog())[0].hash;
        repoHelper.createOrUpdateFile('anotherFileForCommit.txt', 'text');

        await repoHelper.stageAndCommitAll(['anotherFileForCommit.txt']);

        //When
        const files = await new Git(repoHelper.repoDir).diffRange(
          'origin/main',
          currentRef
        );

        //Then
        expect(files).toEqual(new Set(['newFile.txt']));
      });
    });
  });
});
