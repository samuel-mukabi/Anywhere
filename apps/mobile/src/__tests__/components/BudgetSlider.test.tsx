/**
 * __tests__/components/BudgetSlider.test.tsx
 *
 * Component test for BudgetSlider.
 * We simulate a drag by firing the onValueChange and onSlidingComplete
 * events directly on the Slider — this is the standard RNTL approach
 * since native gesture simulation isn't available in jsdom.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

// Mock the @react-native-community/slider — it's a native module
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ onValueChange, onSlidingComplete, testID, ...props }: any) =>
      React.createElement(View, {
        testID: testID || 'budget-slider',
        onValueChange,
        onSlidingComplete,
        ...props,
      }),
  };
});

import { BudgetSlider } from '@/components/ui/BudgetSlider';

describe('BudgetSlider', () => {
  it('renders the initial budget value correctly', () => {
    const onChange = jest.fn();
    render(<BudgetSlider min={500} max={15000} value={3000} onChange={onChange} />);

    // The formatted value label should be visible
    expect(screen.getByText('$3,000')).toBeTruthy();
  });

  it('renders the min and max range labels', () => {
    render(<BudgetSlider min={500} max={15000} value={3000} onChange={jest.fn()} />);
    expect(screen.getByText('$500')).toBeTruthy();
    expect(screen.getByText('$15,000')).toBeTruthy();
  });

  it('calls onChange with the rounded value when sliding completes', () => {
    const onChange = jest.fn();
    render(
      <BudgetSlider min={500} max={15000} value={3000} onChange={onChange} step={100} />,
    );

    const slider = screen.getByTestId('budget-slider');
    fireEvent(slider, 'slidingComplete', 2750);

    // 2750 rounded to step 100 → 2800
    expect(onChange).toHaveBeenCalledWith(2800);
  });

  it('updates displayed value during drag (onValueChange)', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <BudgetSlider min={500} max={15000} value={3000} onChange={onChange} step={100} />,
    );

    const slider = screen.getByTestId('budget-slider');
    fireEvent(slider, 'valueChange', 5100);

    // Local state update — the rendered label should jump to $5,100
    expect(screen.getByText('$5,100')).toBeTruthy();
    // onChange should NOT have been called yet (only fires on slidingComplete)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects a custom currency symbol', () => {
    render(<BudgetSlider min={500} max={15000} value={1000} onChange={jest.fn()} currency="€" />);
    expect(screen.getByText('€1,000')).toBeTruthy();
  });
});
