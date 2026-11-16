let controller = new AbortController();

/**
 * Start a new page, ending the previous one.
 *
 * @returns a signal that aborts when the next page starts
 */
export function startPage(): AbortSignal {
  controller.abort();
  controller = new AbortController();
  return controller.signal;
}

/**
 * The current page's lifetime.
 *
 * @returns a signal that aborts when the current page is replaced
 */
export function pageSignal(): AbortSignal {
  return controller.signal;
}
