import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AuthHeader from '../../components/auth-components/AuthHeader';

describe('AuthHeader', () => {
  const mockOnBack = jest.fn();
  const title = 'Test Header';

  beforeEach(() => {
    mockOnBack.mockClear();
  });

  it('renders correctly with the provided title', () => {
    const { getByText } = render(<AuthHeader title={title} onBack={mockOnBack} />);
    expect(getByText(title)).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByTestId } = render(<AuthHeader title={title} onBack={mockOnBack} />);
    const backButton = getByTestId('back-button');
    
    fireEvent.press(backButton);
    
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
  
  it('matches snapshot', () => {
    const { toJSON } = render(<AuthHeader title={title} onBack={mockOnBack} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
