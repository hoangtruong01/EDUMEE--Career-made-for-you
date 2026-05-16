import appConfig from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not provide a hard-coded Gemini API key fallback', () => {
    expect(appConfig().geminiApiKey).toBe('');
  });

  it('uses GEMINI_API_KEY when configured', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    expect(appConfig().geminiApiKey).toBe('test-gemini-key');
  });
});
