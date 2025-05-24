import React from 'react';
import { render } from '@testing-library/react-native';
import MainFeedScreen from '../../screens/MainFeedScreen';
import { NavigationContainer } from '@react-navigation/native';

describe('MainFeedScreen', () => {
  it('renders correctly with title and subtitle', () => {
    const { getByText } = render(
      // MainFeedScreen is simple and doesn't use navigation hooks directly,
      // but wrapping in NavigationContainer is good practice for screens.
      <NavigationContainer>
        <MainFeedScreen />
      </NavigationContainer>
    );

    expect(getByText('Main Feed')).toBeTruthy();
    expect(getByText('Authentication successful!')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <MainFeedScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
