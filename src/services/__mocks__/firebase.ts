// Mock implementation of firebase service
export const auth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((callback) => {
    // Simulate auth state change
    callback(null);
    return jest.fn(); // Return unsubscribe function
  }),
};

export const signInWithEmailAndPassword = jest.fn(() => 
  Promise.resolve({ user: { uid: 'test-uid' } })
);

export const createUserWithEmailAndPassword = jest.fn(() => 
  Promise.resolve({ user: { uid: 'test-uid' } })
);

export const signOut = jest.fn(() => Promise.resolve());
