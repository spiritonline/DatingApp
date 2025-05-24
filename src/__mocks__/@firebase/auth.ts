// Mock implementation of @firebase/auth
export const getAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: jest.fn((callback) => {
    // Simulate auth state change
    callback(null);
    return jest.fn(); // Return unsubscribe function
  }),
}));

export const signInWithEmailAndPassword = jest.fn(() => 
  Promise.resolve({ user: { uid: 'test-uid' } })
);

export const createUserWithEmailAndPassword = jest.fn(() => 
  Promise.resolve({ user: { uid: 'test-uid' } })
);

export const signOut = jest.fn(() => Promise.resolve());

export const onAuthStateChanged = jest.fn((auth, callback) => {
  // Simulate auth state change
  callback(null);
  return jest.fn(); // Return unsubscribe function
});

export const GoogleAuthProvider = jest.fn(() => ({
  setCustomParameters: jest.fn(),
}));

export const signInWithPopup = jest.fn(() => 
  Promise.resolve({ user: { uid: 'test-uid' } })
);
