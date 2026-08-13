import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockSyncNow = jest.fn();
const mockOfflineState = {
  isOnline: true,
  syncInProgress: false,
  queueLength: 0,
  failedCount: 0,
};

jest.mock('@/hooks/useOffline', () => ({
  useIsOnline: () => mockOfflineState.isOnline,
  useSyncInProgress: () => mockOfflineState.syncInProgress,
  useSyncQueueLength: () => mockOfflineState.queueLength,
  useSyncFailedCount: () => mockOfflineState.failedCount,
  useOfflineActions: () => ({ syncNow: mockSyncNow }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import { OfflineBanner } from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineState.isOnline = true;
    mockOfflineState.syncInProgress = false;
    mockOfflineState.queueLength = 0;
    mockOfflineState.failedCount = 0;
  });

  it('surfaces online queued changes and guards manual sync from duplicate presses', async () => {
    mockOfflineState.queueLength = 2;
    let resolveSync!: () => void;
    mockSyncNow.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveSync = resolve;
      }),
    );

    const screen = render(<OfflineBanner />);
    expect(screen.getByText('2 changes waiting to sync')).toBeTruthy();

    const sync = screen.getByLabelText('Sync pending changes now');
    fireEvent.press(sync);
    fireEvent.press(sync);
    expect(mockSyncNow).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync();
    });
  });

  it('explains terminal rollbacks and lets the user dismiss the notice', () => {
    mockOfflineState.failedCount = 1;
    const screen = render(<OfflineBanner />);

    expect(screen.getByText("1 change couldn't be saved and was reverted")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Dismiss sync failure notice'));
    expect(screen.queryByText("1 change couldn't be saved and was reverted")).toBeNull();
  });

  it('keeps offline queued changes passive until connectivity returns', () => {
    mockOfflineState.isOnline = false;
    mockOfflineState.queueLength = 3;
    const screen = render(<OfflineBanner />);

    expect(
      screen.getByText("You're offline — 3 actions will sync when you're back online"),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Sync pending changes now')).toBeNull();
  });
});
