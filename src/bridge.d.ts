import type { Data, Settings, Snapshot } from './domain';
declare global {
  interface Window {
    lighttodo: {
      load(): Promise<Snapshot>;
      save(data: Data): Promise<boolean>;
      settings(settings: Settings): Promise<Settings>;
      chooseFolder(): Promise<Snapshot | null>;
      openFolder(): Promise<void>;
      exportBackup(): Promise<boolean>;
      importBackup(): Promise<Snapshot | null>;
      minimize(): Promise<void>;
      close(): Promise<void>;
    };
  }
}
