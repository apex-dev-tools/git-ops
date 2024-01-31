/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import {
  Git,
  getDefaultBranchDiffByRef,
  getDefaultBranchDiff,
  getDiffRange,
  getLocalChanges,
} from '../src';

import path from 'path';
jest.mock('path');

const mockGitImpl = {
  getDefaultBranchName: jest.fn(),
  getLocalChangedAndCreated: jest.fn(),
  diffRange: jest.fn(),
  gitRoot: jest.fn(),
};

jest.mock('../../src/Git/Git', () => {
  return {
    Git: jest.fn().mockImplementation(() => mockGitImpl),
  };
});

const mockedGit = jest.mocked(Git, { shallow: true });

describe('Branch changes', () => {
  const mockRootDir = 'user/fake/path';

  beforeAll(() => {
    mockGitImpl.gitRoot.mockResolvedValue('abs/path/to/repo');
    jest
      .spyOn(path, 'resolve')
      .mockImplementation(dir => `${mockRootDir}/${dir}`);
    jest.spyOn(path, 'join').mockImplementation((a, b) => `${a}/${b}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultBranchDiffByRef', () => {
    it('returns the correct set of files when git ops resolve', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDefaultBranchDiffByRef(
        './some/path/to/dir',
        'abc12fcd'
      );

      //Then
      expect(mockedGit).toHaveBeenCalledWith('./some/path/to/dir');
      expect(mockGitImpl.getDefaultBranchName).toBeCalledTimes(1);
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith(
        'default/branch/name',
        'abc12fcd'
      );
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/abs/path/to/repo/File.txt`,
          `${mockRootDir}/abs/path/to/repo/AnotherClass.txt`,
          `${mockRootDir}/abs/path/to/repo/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getDefaultBranchName" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockRejectedValue(
        Error('no head ref error')
      );

      //When/Then
      await expect(
        getDefaultBranchDiffByRef('./some/path/to/dir', 'abc12fcd')
      ).rejects.toEqual(
        Error("Local branch operation failed. Cause: 'no head ref error'")
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(
        getDefaultBranchDiffByRef('./some/path/to/dir', 'abc12fcd')
      ).rejects.toEqual(
        Error(
          "Local branch operation failed. Cause: 'Getting diff operation failed. Cause: 'op failed''"
        )
      );
    });
  });

  describe('getDefaultBranchDiff', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDefaultBranchDiff('./some/path/to/dir');

      //Then
      expect(mockedGit).toHaveBeenCalledWith('./some/path/to/dir');
      expect(mockGitImpl.getDefaultBranchName).toBeCalledTimes(1);
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith(
        'default/branch/name',
        'HEAD'
      );
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/abs/path/to/repo/File.txt`,
          `${mockRootDir}/abs/path/to/repo/AnotherClass.txt`,
          `${mockRootDir}/abs/path/to/repo/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(getDefaultBranchDiff('./some/path/to/dir')).rejects.toEqual(
        Error(
          "Local branch operation failed. Cause: 'Getting diff operation failed. Cause: 'op failed''"
        )
      );
    });
  });

  describe('getDiffRange', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDiffRange('./some/path/to/dir', 'ref1', 'ref2');

      //Then
      expect(mockedGit).toHaveBeenCalledWith('./some/path/to/dir');
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith('ref1', 'ref2');
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/abs/path/to/repo/File.txt`,
          `${mockRootDir}/abs/path/to/repo/AnotherClass.txt`,
          `${mockRootDir}/abs/path/to/repo/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(
        getDiffRange('./some/path/to/dir', 'ref1', 'ref2')
      ).rejects.toEqual(
        Error("Getting diff operation failed. Cause: 'op failed'")
      );
    });
  });

  describe('getLocalChanges', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getLocalChanges('./some/path/to/dir');

      //Then
      expect(mockedGit).toHaveBeenCalledWith('./some/path/to/dir');
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(res).toEqual(
        new Set([`${mockRootDir}/abs/path/to/repo/SomeFile.txt`])
      );
    });

    it('rejects and throws error when op fails', async () => {
      //Given
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(getLocalChanges('./some/path/to/dir')).rejects.toEqual(
        Error("Getting local changes operation failed. Cause: 'op failed'")
      );
    });
  });
});
