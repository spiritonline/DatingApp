describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the welcome screen on app launch', async () => {
    await expect(element(by.text('Dating App'))).toBeVisible();
    await expect(element(by.text('Find your perfect match'))).toBeVisible();
    await expect(element(by.text('Sign Up'))).toBeVisible();
    await expect(element(by.text('Log In'))).toBeVisible();
  });

  it('should navigate to sign up screen and back', async () => {
    await element(by.text('Sign Up')).tap();
    await expect(element(by.text('Create Account'))).toBeVisible();
    await element(by.id('back-button')).tap();
    await expect(element(by.text('Dating App'))).toBeVisible();
  });

  it('should navigate to log in screen and back', async () => {
    await element(by.text('Log In')).tap();
    await expect(element(by.text('Log In'))).toBeVisible();
    await element(by.id('back-button')).tap();
    await expect(element(by.text('Dating App'))).toBeVisible();
  });

  it('should complete the sign up flow with valid credentials', async () => {
    await element(by.text('Sign Up')).tap();
    
    // Fill in the form fields
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('confirm-password-input')).typeText('password123');
    
    // Accept terms and location checks
    await element(by.id('terms-checkbox')).tap();
    await element(by.id('location-checkbox')).tap();
    
    // Submit the form
    await element(by.id('signup-button')).tap();
    
    // Verify that we've navigated to the Main Feed
    await expect(element(by.text('Main Feed'))).toBeVisible();
    await expect(element(by.text('Authentication successful!'))).toBeVisible();
  });

  it('should complete the login flow with valid credentials', async () => {
    // Return to welcome screen
    await device.reloadReactNative();
    
    await element(by.text('Log In')).tap();
    
    // Fill in the form fields
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Submit the form
    await element(by.id('login-button')).tap();
    
    // Verify that we've navigated to the Main Feed
    await expect(element(by.text('Main Feed'))).toBeVisible();
    await expect(element(by.text('Authentication successful!'))).toBeVisible();
  });
});
