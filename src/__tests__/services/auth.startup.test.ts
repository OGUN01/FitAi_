describe("authService startup behavior", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not eagerly configure Google auth on module import", async () => {
    const mockConfigure = jest.fn();

    jest.doMock("../../services/googleAuth", () => ({
      googleAuthService: {
        configure: mockConfigure,
        signInWithGoogle: jest.fn(),
        handleGoogleCallback: jest.fn(),
        linkGoogleAccount: jest.fn(),
        unlinkGoogleAccount: jest.fn(),
        isGoogleLinked: jest.fn(),
        getGoogleUserInfo: jest.fn(),
      },
    }));

    jest.doMock("../../services/supabase", () => ({
      supabase: {
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: jest.fn(),
          getSession: jest.fn(),
          onAuthStateChange: jest.fn(),
        },
      },
    }));

    jest.doMock("../../services/migrationManager", () => ({
      migrationManager: {
        startProfileMigration: jest.fn(),
      },
    }));

    jest.doMock("../../services/DataBridge", () => ({
      dataBridge: {
        setUserId: jest.fn(),
        hasGuestDataForMigration: jest.fn(),
      },
    }));

    jest.isolateModules(() => {
      require("../../services/auth");
    });

    expect(mockConfigure).not.toHaveBeenCalled();
  });
});
