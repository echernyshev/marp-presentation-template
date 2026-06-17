/**
 * Deterministic helpers for stubbing `process.stdin.isTTY` in tests.
 *
 * Background: several test files (create-project, prompt-utils, add-themes-cli)
 * manipulate the REAL global `process.stdin.isTTY`. Under `maxWorkers: 1`, Jest
 * recycles a single worker process across files, so global state set by one
 * file's afterEach can leak into another file's beforeEach.
 *
 * The historical flake: `prompt-utils.test.js` restored isTTY via
 *   Object.defineProperty(process.stdin, 'isTTY', { value, writable: true })
 * WITHOUT `configurable: true`. That left a NON-configurable own property on
 * `process.stdin`. When `add-themes-cli.test.js` later ran in the same worker
 * and tried `Object.defineProperty(..., { configurable: true })`, it threw
 * `TypeError: Cannot redefine property: isTTY` inside beforeEach — failing the
 * setup of the entire TTY describe block, dropping that branch's coverage, and
 * tripping the per-file lines:85 gate.
 *
 * In non-TTY CI environments `process.stdin.isTTY` is `undefined` and NOT an own
 * property, so the pristine state is an ABSENT property, not `{value: undefined}`.
 *
 * These helpers fix both problems:
 *   - every definition uses `configurable: true, writable: true` so any later
 *     redefine (by this file or another) succeeds;
 *   - teardown DELETES the property to return to the true pristine state.
 */

/**
 * Save the current state of `process.stdin.isTTY` so it can be restored.
 * Returns a snapshot object to pass to `restoreStdinIsTTY`.
 */
function snapshotStdinIsTTY() {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  // isTTY is not an own property natively (in non-TTY envs) -> record absence.
  return { hadOwn: !!descriptor, value: descriptor ? descriptor.value : undefined };
}

/**
 * Force `process.stdin.isTTY` to a specific value for a test.
 * Always configurable + writable so it can be safely redefined or deleted later.
 */
function setStdinIsTTY(value) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
    writable: true,
    enumerable: false
  });
}

/**
 * Restore `process.stdin.isTTY` to its snapshot state.
 * If it was not originally an own property, the property is DELETED (pristine).
 */
function restoreStdinIsTTY(snapshot) {
  if (!snapshot || !snapshot.hadOwn) {
    delete process.stdin.isTTY;
    return;
  }
  Object.defineProperty(process.stdin, 'isTTY', {
    value: snapshot.value,
    configurable: true,
    writable: true,
    enumerable: false
  });
}

module.exports = {
  snapshotStdinIsTTY,
  setStdinIsTTY,
  restoreStdinIsTTY
};
