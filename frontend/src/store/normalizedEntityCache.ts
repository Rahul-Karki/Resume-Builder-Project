type Entity = { id: string; [key: string]: unknown };

interface CacheState<T extends Entity> {
  byId: Record<string, T>;
  allIds: string[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export class NormalizedEntityCache<T extends Entity> {
  private state: CacheState<T> = { byId: {}, allIds: [], loading: {}, errors: {} };
  private listeners: Array<() => void> = [];

  private notify() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): Readonly<CacheState<T>> {
    return this.state;
  }

  getById(id: string): T | undefined {
    return this.state.byId[id];
  }

  getAll(): T[] {
    return this.state.allIds.map((id) => this.state.byId[id]).filter(Boolean);
  }

  upsert(entity: T) {
    this.state = {
      ...this.state,
      byId: { ...this.state.byId, [entity.id]: entity },
      allIds: this.state.allIds.includes(entity.id)
        ? this.state.allIds
        : [...this.state.allIds, entity.id],
    };
    this.notify();
  }

  upsertMany(entities: T[]) {
    const byId = { ...this.state.byId };
    const allIds = [...this.state.allIds];
    for (const entity of entities) {
      byId[entity.id] = entity;
      if (!allIds.includes(entity.id)) {
        allIds.push(entity.id);
      }
    }
    this.state = { ...this.state, byId, allIds };
    this.notify();
  }

  remove(id: string) {
    const { [id]: _removed, ...rest } = this.state.byId;
    this.state = {
      ...this.state,
      byId: rest,
      allIds: this.state.allIds.filter((i) => i !== id),
    };
    this.notify();
  }

  setLoading(key: string, loading: boolean) {
    this.state = {
      ...this.state,
      loading: { ...this.state.loading, [key]: loading },
    };
    this.notify();
  }

  setError(key: string, error: string | null) {
    this.state = {
      ...this.state,
      errors: { ...this.state.errors, [key]: error },
    };
    this.notify();
  }

  clear() {
    this.state = { byId: {}, allIds: [], loading: {}, errors: {} };
    this.notify();
  }

  get cacheSize() {
    return this.state.allIds.length;
  }
}
