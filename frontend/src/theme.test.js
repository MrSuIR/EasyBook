import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTheme,
  getPreferredTheme,
  initializeTheme,
  THEME_STORAGE_KEY,
} from "./theme.js";

function installThemeEnvironment({
  savedTheme = null,
  systemDark = false,
} = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const storage = new Map(savedTheme ? [[THEME_STORAGE_KEY, savedTheme]] : []);
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia: () => ({ matches: systemDark }),
  };
  globalThis.document = { documentElement: { dataset: {}, style: {} } };
  return () => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  };
}

test("theme preference uses a saved manual choice before the system setting", () => {
  const restore = installThemeEnvironment({
    savedTheme: "light",
    systemDark: true,
  });
  try {
    assert.equal(getPreferredTheme(), "light");
    assert.equal(initializeTheme(), "light");
    assert.equal(document.documentElement.dataset.theme, "light");
    assert.equal(document.documentElement.style.colorScheme, "light");
  } finally {
    restore();
  }
});

test("theme preference follows the system when no manual choice exists", () => {
  const restore = installThemeEnvironment({ systemDark: true });
  try {
    assert.equal(getPreferredTheme(), "dark");
    applyTheme("dark");
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(document.documentElement.style.colorScheme, "dark");
  } finally {
    restore();
  }
});
