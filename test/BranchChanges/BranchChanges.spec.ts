/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import { Git } from '../../src/Git/Git';
import {
  getDefaultBranchDiffByRef,
  getDefaultBranchDiff,
} from '../../src/FilesChanged/BranchChanges';

const mockGitImpl = {
  getDefaultBranchName: jest.fn(),
  getLocalChangedAndCreated: jest.fn(),
  diffRange: jest.fn(),
};

jest.mock('../../src/Git/Git', () => {
  return {
    Git: jest.fn().mockImplementation(() => mockGitImpl),
  };
});

const mockedGit = jest.mocked(Git, { shallow: true });

describe('Branch changes', () => {
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
        new Set(['File.txt', 'AnotherClass.txt', 'SomeFile.txt'])
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
      ).rejects.toEqual(Error('Failed getting diff: no head ref error'));
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
      ).rejects.toEqual(Error('Failed getting diff: op failed'));
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
        new Set(['File.txt', 'AnotherClass.txt', 'SomeFile.txt'])
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
        Error('Failed getting diff: op failed')
      );
    });
  });
});
