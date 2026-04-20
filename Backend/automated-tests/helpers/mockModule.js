function mockModule(moduleRequest, exports) {
  const resolvedPath = require.resolve(moduleRequest);
  const previous = require.cache[resolvedPath];

  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports,
    children: [],
    paths: [],
  };

  return () => {
    if (previous) {
      require.cache[resolvedPath] = previous;
      return;
    }

    delete require.cache[resolvedPath];
  };
}

function loadWithMocks(moduleRequest, mocks = {}) {
  const restoreMocks = Object.entries(mocks).map(([moduleRequestKey, exports]) =>
    mockModule(moduleRequestKey, exports),
  );

  const resolvedTarget = require.resolve(moduleRequest);
  delete require.cache[resolvedTarget];

  const loadedModule = require(moduleRequest);

  delete require.cache[resolvedTarget];

  for (const restore of restoreMocks.reverse()) {
    restore();
  }

  return loadedModule;
}

module.exports = {
  loadWithMocks,
  mockModule,
};