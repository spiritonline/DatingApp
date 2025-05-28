const mockCurrentUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  // Add other user properties as needed
};

export const auth = {
  currentUser: mockCurrentUser,
  // Add other auth methods as needed
};

const firebase = {
  auth,
  // Add other Firebase services as needed
};

export default firebase;
