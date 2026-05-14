// Jest test setup
global.console = {
  ...console,
  // Optionally disable console logs in tests
  // log: jest.fn(),
  // error: jest.fn(),
  warn: jest.fn(),
};

beforeAll(() => {
  // Set up environment variables for tests if needed
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup after all tests
});
