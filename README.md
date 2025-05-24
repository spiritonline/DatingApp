# Dating App - Authentication Flow

A React Native + Expo mobile application with a complete authentication flow, including welcome screen, sign-up, and login functionality.

## Features

- Welcome screen with options to sign up or log in
- Sign-up screen with email/password and consent checkboxes
- Login screen with email/password
- Firebase Authentication integration
- Dark mode support
- Responsive design with styled-components
- Accessibility considerations

## Technology Stack

- Expo SDK 53.0.0
- React Native v0.79
- TypeScript (strict mode)
- React Navigation
- Firebase Authentication
- Styled Components
- Jest and React Native Testing Library for unit tests
- Detox for E2E testing

## Getting Started

### Prerequisites

- Node.js (LTS version)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS testing)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/DatingApp.git
cd DatingApp
```

2. Install dependencies
```bash
npm install
```

3. Start the application
```bash
npm start
```

Or specifically for iOS:
```bash
npm run ios
```

## Running Tests

### Unit and Integration Tests

Run the Jest test suite:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:coverage
```

### End-to-End Tests

Build the app for E2E testing:
```bash
npm run e2e:build
```

Run E2E tests:
```bash
npm run e2e:test
```

## Project Structure

```
src/
├── components/
│   └── auth-components/      # Authentication-related components
├── navigation/               # Navigation configuration
├── screens/                  # App screens
├── services/                 # Firebase and other services
├── utils/                    # Utility functions
└── __tests__/               # Test files
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    └── e2e/                 # End-to-end tests
```

## Firebase Configuration

To use your own Firebase project:

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Update the Firebase configuration in `src/services/firebase.ts`

## License

This project is licensed under the MIT License.
