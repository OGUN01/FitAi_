// Type declarations for optional Expo packages
// These packages are loaded dynamically and may not be installed

declare module 'expo-task-manager' {
  export const defineTask: (name: string, task: () => Promise<any>) => void;
  export const isTaskDefined: (name: string) => boolean;
  export const unregisterTaskAsync: (name: string) => Promise<void>;
}

declare module 'expo-background-fetch' {
  export enum BackgroundFetchResult {
    NoData = 1,
    NewData = 2,
    Failed = 3,
  }
  export const registerTaskAsync: (name: string, options?: any) => Promise<void>;
  export const unregisterTaskAsync: (name: string) => Promise<void>;
  export const getStatusAsync: () => Promise<number>;
}
