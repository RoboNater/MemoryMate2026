const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {},
}));

describe('supabaseClient', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockReset();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;

    if (originalAnonKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;

    jest.restoreAllMocks();
  });

  it('does not construct a client when the environment variables are absent', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    let clientModule: typeof import('../supabaseClient');
    jest.isolateModules(() => {
      clientModule = jest.requireActual('../supabaseClient');
    });

    expect(clientModule!.isSupabaseConfigured).toBe(false);
    expect(clientModule!.supabase).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cloud sync is disabled; the app runs offline only.')
    );
  });

  it('constructs a client when both environment variables are present', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
    const client = { auth: {}, from: jest.fn() };
    mockCreateClient.mockReturnValue(client);

    let clientModule: typeof import('../supabaseClient');
    jest.isolateModules(() => {
      clientModule = jest.requireActual('../supabaseClient');
    });

    expect(clientModule!.isSupabaseConfigured).toBe(true);
    expect(clientModule!.supabase).toBe(client);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'public-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
        }),
      })
    );
  });
});
