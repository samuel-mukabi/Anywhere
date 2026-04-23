/**
 * __tests__/components/DestinationPreviewCard.test.tsx
 *
 * Component test for DestinationPreviewCard.
 * Verifies city name, price, climate tag, and CTA buttons render correctly.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// expo-image in tests returns a plain Image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});
// Reanimated must be mocked — the spring runs on native thread unavailable in Jest
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-worklets-core', () => ({ WorkletsModule: {} }));

import { DestinationPreviewCard } from '@/features/destination/destination-preview-card';
import { MOCK_DESTINATION } from '../../../__tests__/mocks/server';

// Wrap in a minimal mock for useTripsStore
const mockTripsState = { saveTrip: jest.fn() };
jest.mock('@/features/trips/trips-store', () => ({
  useTripsStore: jest.fn((selector) => selector ? selector(mockTripsState) : mockTripsState),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('DestinationPreviewCard', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders city name', () => {
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    expect(screen.getByText('Lisbon')).toBeTruthy();
  });

  it('renders country name', () => {
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    expect(screen.getByText(/Portugal/)).toBeTruthy();
  });

  it('renders total cost', () => {
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    expect(screen.getByText('$1450')).toBeTruthy();
  });

  it('renders "Perfect match" climate tag for climateScore >= 80', () => {
    render(<DestinationPreviewCard destination={{ ...MOCK_DESTINATION, climateScore: 88 } as any} />);
    expect(screen.getByText('Perfect match')).toBeTruthy();
  });

  it('renders "Good conditions" climate tag for climateScore < 80', () => {
    render(<DestinationPreviewCard destination={{ ...MOCK_DESTINATION, climateScore: 60 } as any} />);
    expect(screen.getByText('Good conditions')).toBeTruthy();
  });

  it('renders the "Live" freshness badge when flightPrice is set', () => {
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('renders the "Estimated" freshness badge when flightPrice is 0', () => {
    render(<DestinationPreviewCard destination={{ ...MOCK_DESTINATION, flightPrice: 0 } as any} />);
    expect(screen.getByText('Estimated')).toBeTruthy();
  });

  it('calls router.push with destination id on "View full details" press', () => {
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    fireEvent.press(screen.getByText('View full details →'));
    expect(mockPush).toHaveBeenCalledWith(`/destination/${MOCK_DESTINATION.id}`);
  });

  it('fires saveTrip and shows a toast on "Save" press', () => {
    const mockSaveTrip = jest.fn();
    jest.mocked(require('@/features/trips/trips-store').useTripsStore).mockImplementation((selector: any) => 
      selector ? selector({ saveTrip: mockSaveTrip }) : { saveTrip: mockSaveTrip }
    );

    const Toast = require('react-native-toast-message');
    render(<DestinationPreviewCard destination={MOCK_DESTINATION as any} />);
    fireEvent.press(screen.getByText('Save'));
    expect(mockSaveTrip).toHaveBeenCalledWith(MOCK_DESTINATION);
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
