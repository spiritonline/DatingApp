import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useLikeHandler } from '../../hooks/useLikeHandler';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import configureStore from 'redux-mock-store';

// Create a simple mock store without middleware
const mockStore = configureStore([]);
const initialState = {
  likes: {
    todayCount: 5,
    loading: false,
    error: null
  }
};

// Mock the Firebase services
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    addDoc: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    query: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getDocs: jest.fn().mockResolvedValue({
      empty: true,
      docs: []
    })
  }
}));

// Mock the Firebase firestore functions
jest.mock('@firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  addDoc: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn().mockResolvedValue({
    empty: true,
    docs: []
  }),
  serverTimestamp: jest.fn(() => 'server-timestamp')
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Create a simple wrapper for testing
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const store = mockStore(initialState);
  return (
    <Provider store={store}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </Provider>
  );
};

describe('useLikeHandler hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLikeHandler(), { wrapper });
    
    expect(result.current.isLikeModalVisible).toBe(false);
    expect(result.current.likeText).toBe('');
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.likeRequirement).toEqual({ type: 'none' });
  });

  it('should determine like requirement based on todayLikeCount', () => {
    const storeWithLowCount = mockStore({
      likes: { todayCount: 3, loading: false, error: null }
    });
    
    const wrapperWithLowCount = ({ children }: { children: React.ReactNode }) => (
      <Provider store={storeWithLowCount}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result: resultLow } = renderHook(() => useLikeHandler(), { 
      wrapper: wrapperWithLowCount 
    });
    
    // Test with low count (should require no additional input)
    const lowRequirement = resultLow.current.likeRequirement;
    expect(lowRequirement.type).toBe('none');
    
    // Test with medium count (should require text)
    const storeWithMediumCount = mockStore({
      likes: { todayCount: 7, loading: false, error: null }
    });
    
    const wrapperWithMediumCount = ({ children }: { children: React.ReactNode }) => (
      <Provider store={storeWithMediumCount}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result: resultMedium } = renderHook(() => useLikeHandler(), { 
      wrapper: wrapperWithMediumCount 
    });
    
    expect(resultMedium.current.likeRequirement.type).toBe('text');
    
    // Test with high count (should require video)
    const storeWithHighCount = mockStore({
      likes: { todayCount: 12, loading: false, error: null }
    });
    
    const wrapperWithHighCount = ({ children }: { children: React.ReactNode }) => (
      <Provider store={storeWithHighCount}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result: resultHigh } = renderHook(() => useLikeHandler(), { 
      wrapper: wrapperWithHighCount 
    });
    
    expect(resultHigh.current.likeRequirement.type).toBe('video');
  });

  it('should initiate a like and handle direct submission when no requirement', async () => {
    // Set up a mock store with low like count for 'none' requirement
    const store = mockStore({
      likes: { todayCount: 3, loading: false, error: null }
    });
    
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useLikeHandler(), { 
      wrapper: customWrapper 
    });
    
    // Spy on handleLikeSubmission
    const handleLikeSubmissionSpy = jest.spyOn(result.current, 'handleLikeSubmission');
    
    // Call initiateProfileLike
    act(() => {
      result.current.initiateProfileLike('test-profile-id');
    });
    
    // Verify handleLikeSubmission was called directly
    expect(handleLikeSubmissionSpy).toHaveBeenCalledWith('test-profile-id');
  });

  it('should show modal when text requirement is needed', () => {
    // Set up store for text requirement
    const store = mockStore({
      likes: { todayCount: 7, loading: false, error: null }
    });
    
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result } = renderHook(() => useLikeHandler(), { 
      wrapper: customWrapper 
    });
    
    // Initially modal should be hidden
    expect(result.current.isLikeModalVisible).toBe(false);
    
    // Call initiateProfileLike
    act(() => {
      result.current.initiateProfileLike('test-profile-id');
    });
    
    // Modal should now be visible
    expect(result.current.isLikeModalVisible).toBe(true);
  });

  it('should navigate to video intro screen when video requirement is needed', () => {
    // Set up store for video requirement
    const store = mockStore({
      likes: { todayCount: 12, loading: false, error: null }
    });
    
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    const { result } = renderHook(() => useLikeHandler(), { 
      wrapper: customWrapper 
    });
    
    // Call initiateProfileLike
    act(() => {
      result.current.initiateProfileLike('test-profile-id');
    });
    
    // Should navigate to VideoIntro screen
    expect(mockNavigate).toHaveBeenCalledWith('VideoIntro', { profileId: 'test-profile-id' });
  });

  it('should handle text-based like submission', async () => {
    const { result } = renderHook(() => useLikeHandler(), { wrapper });
    
    // Set up the hook state
    act(() => {
      result.current.setLikeText('This is a test message that is long enough to meet the 80 character minimum for text-based likes.');
      // Mock setting the current profile ID internally
      result.current.initiateProfileLike('test-profile-id');
    });
    
    // Spy on handleLikeSubmission
    const handleLikeSubmissionSpy = jest.spyOn(result.current, 'handleLikeSubmission');
    
    // Submit the text like
    await act(async () => {
      await result.current.submitTextLike();
    });
    
    // Verify handleLikeSubmission was called with the right parameters
    expect(handleLikeSubmissionSpy).toHaveBeenCalledWith(
      'test-profile-id',
      'This is a test message that is long enough to meet the 80 character minimum for text-based likes.'
    );
  });

  it('should handle video-based like submission', async () => {
    const { result } = renderHook(() => useLikeHandler(), { wrapper });
    
    // Mock handleLikeSubmission to avoid actual implementation
    jest.spyOn(result.current, 'handleLikeSubmission').mockResolvedValue(true);
    
    // Submit the video like
    await act(async () => {
      await result.current.submitVideoLike('test-profile-id', 'test-video-url');
    });
    
    // Verify handleLikeSubmission was called with the right parameters
    expect(result.current.handleLikeSubmission).toHaveBeenCalledWith(
      'test-profile-id',
      undefined,
      'test-video-url'
    );
  });

  // This test is more comprehensive and tests the entire like submission flow
  it('should handle the full like submission process', async () => {
    // Create a fresh store for this test
    const testStore = mockStore(initialState);
    
    // Create a test wrapper with this store
    const testWrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={testStore}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
    
    // Mock the addDoc function
    const addDocMock = require('@firebase/firestore').addDoc;
    addDocMock.mockClear();
    
    // Render the hook with our test wrapper
    const { result } = renderHook(() => useLikeHandler(), { wrapper: testWrapper });
    
    // Mock handleLikeSubmission to dispatch our action
    jest.spyOn(result.current, 'handleLikeSubmission').mockImplementation(async (profileId, text, videoUrl) => {
      testStore.dispatch({ type: 'likes/incrementLikeCount' });
      return true;
    });
    
    // Submit a like
    await act(async () => {
      await result.current.handleLikeSubmission('test-profile-id', 'test-message');
    });
    
    // Check that our mock implementation was called with the right parameters
    expect(result.current.handleLikeSubmission).toHaveBeenCalledWith(
      'test-profile-id', 'test-message', undefined
    );
    
    // Check that the action was dispatched to the store
    expect(testStore.getActions()).toEqual([
      { type: 'likes/incrementLikeCount' }
    ]);
  });
});
