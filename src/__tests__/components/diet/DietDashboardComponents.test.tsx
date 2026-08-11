import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

let mockDownloadState = 'not_downloaded';
const mockDownloadDatabase = jest.fn();
const mockCancelDownload = jest.fn();

jest.mock('@/services/sqliteFood', () => ({
  sqliteFood: {
    getState: jest.fn(() => mockDownloadState),
    isDatabaseReady: jest.fn(() => mockDownloadState === 'ready'),
    ensureDbReady: jest.fn().mockResolvedValue(undefined),
    downloadDatabase: (...args: unknown[]) => mockDownloadDatabase(...args),
    cancelDownload: (...args: unknown[]) => mockCancelDownload(...args),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    trigger: jest.fn(),
  },
}));

import DatabaseDownloadBanner from '@/components/DatabaseDownloadBanner';

beforeEach(() => {
  mockDownloadState = 'not_downloaded';
  mockDownloadDatabase.mockReset().mockResolvedValue(undefined);
  mockCancelDownload.mockReset().mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// DatabaseDownloadBanner (active — rendered on the Diet dashboard)
// ---------------------------------------------------------------------------

describe('DatabaseDownloadBanner', () => {
  it('renders the not_downloaded banner with Download Now and Skip actions', () => {
    mockDownloadState = 'not_downloaded';
    const onDismiss = jest.fn();
    const screen = render(<DatabaseDownloadBanner onDismiss={onDismiss} />);

    expect(screen.getByText('Offline food database available')).toBeTruthy();
    expect(screen.getByText('Download Now')).toBeTruthy();
    expect(screen.getByLabelText('Download Now')).toBeTruthy();
    expect(screen.getByText('Skip for Now')).toBeTruthy();
    expect(screen.getByLabelText('Skip for Now')).toBeTruthy();

    const download = screen.getByLabelText('Download Now');
    expect(StyleSheet.flatten(download.props.style)).toMatchObject({
      minHeight: 44,
    });

    fireEvent.press(screen.getByLabelText('Skip for Now'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // After dismiss, isDismissed=true → component returns null.
    expect(screen.queryByText('Offline food database available')).toBeNull();
  });

  it('renders Pause and Cancel while downloading and both invoke cancelDownload', async () => {
    mockDownloadState = 'downloading';

    const paused = render(<DatabaseDownloadBanner />);
    const pause = paused.getByLabelText('Pause');
    expect(StyleSheet.flatten(pause.props.style)).toMatchObject({
      minHeight: 44,
    });
    fireEvent.press(pause);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(1));
    paused.unmount();

    mockCancelDownload.mockClear();
    mockDownloadState = 'downloading';

    const cancelled = render(<DatabaseDownloadBanner />);
    const cancel = cancelled.getByLabelText('Cancel');
    expect(StyleSheet.flatten(cancel.props.style)).toMatchObject({
      minHeight: 44,
    });
    fireEvent.press(cancel);
    await waitFor(() => expect(mockCancelDownload).toHaveBeenCalledTimes(1));
  });

  it('renders Retry in error state and invoking it calls downloadDatabase', async () => {
    mockDownloadState = 'error';
    const screen = render(<DatabaseDownloadBanner />);

    expect(screen.getByLabelText('Retry')).toBeTruthy();
    expect(screen.getByText('Download failed')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Retry'));
    // handleRetry sets state to not_downloaded then calls handleDownload,
    // which sets state to "downloading" and awaits downloadDatabase.
    await waitFor(() => expect(mockDownloadDatabase).toHaveBeenCalledTimes(1));
  });

  it('shows Database ready then auto-dismisses after 3s calling onDismiss', () => {
    jest.useFakeTimers();
    mockDownloadState = 'ready';
    const onDismiss = jest.fn();
    const screen = render(<DatabaseDownloadBanner onDismiss={onDismiss} />);

    expect(screen.getByText('Database ready')).toBeTruthy();

    act(() => jest.advanceTimersByTime(3000));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Database ready')).toBeNull();
    jest.useRealTimers();
  });
});
