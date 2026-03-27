describe("initializeBackend startup path", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not eagerly initialize CRUD operations on startup", async () => {
    const mockApiInitialize = jest.fn().mockResolvedValue(undefined);
    const mockDataBridgeInitialize = jest.fn().mockResolvedValue(undefined);
    const mockCrudInitialize = jest.fn().mockResolvedValue(undefined);
    const mockLoggerInfo = jest.fn();

    jest.doMock("../../services/api", () => ({
      api: {
        initialize: mockApiInitialize,
        healthCheck: jest.fn(),
      },
      supabase: {},
    }));

    jest.doMock("../../hooks/useAuth", () => ({
      useAuth: jest.fn(),
    }));

    jest.doMock("../../hooks/useUser", () => ({
      useUser: jest.fn(),
    }));

    jest.doMock("../../stores/profileStore", () => ({
      useProfileStore: jest.fn(),
    }));

    jest.doMock("../../hooks/useOffline", () => ({
      useOffline: jest.fn(),
    }));

    jest.doMock("../../services/DataBridge", () => ({
      dataBridge: {
        initialize: mockDataBridgeInitialize,
      },
    }));

    jest.doMock("../../services/crudOperations", () => ({
      crudOperations: {
        initialize: mockCrudInitialize,
      },
    }));

    jest.doMock("../../utils/logger", () => ({
      logger: {
        info: mockLoggerInfo,
      },
    }));

    let initializeBackend: (() => Promise<void>) | undefined;

    jest.isolateModules(() => {
      ({ initializeBackend } = require("../../utils/integration"));
    });

    await initializeBackend?.();

    expect(mockApiInitialize).toHaveBeenCalledTimes(1);
    expect(mockCrudInitialize).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith("Backend initialized successfully");
  });
});
