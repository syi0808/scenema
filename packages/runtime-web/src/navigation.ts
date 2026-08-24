export type NavigationListener = () => void;

export interface NavigationObserver {
  subscribe(listener: NavigationListener): () => void;
  dispose(): void;
}

export function createNavigationObserver(window: Window): NavigationObserver {
  const listeners = new Set<NavigationListener>();
  const history = window.history;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const notify = () => {
    for (const listener of listeners) listener();
  };
  const pushState: History["pushState"] = function (data, unused, url) {
    originalPushState.call(history, data, unused, url);
    notify();
  };
  const replaceState: History["replaceState"] = function (data, unused, url) {
    originalReplaceState.call(history, data, unused, url);
    notify();
  };

  history.pushState = pushState;
  history.replaceState = replaceState;
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  window.addEventListener("pageshow", notify);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      window.removeEventListener("popstate", notify);
      window.removeEventListener("hashchange", notify);
      window.removeEventListener("pageshow", notify);
      if (history.pushState === pushState) history.pushState = originalPushState;
      if (history.replaceState === replaceState) history.replaceState = originalReplaceState;
    },
  };
}
