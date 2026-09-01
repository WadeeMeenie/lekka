export const Platform = {
  OS: "web" as const,
  select<T>(values: { web?: T; default?: T }) {
    return values.web ?? values.default;
  },
};

export const NativeModules = {};
export const TurboModuleRegistry = {
  getEnforcing: () => ({}),
  get: () => null,
};
