export type Migration = {
  id: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
};
