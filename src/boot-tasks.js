// A fixed set of real readiness tasks; no elapsed-time estimates.
export async function runBootTasks(tasks, onProgress) {
  if (!tasks.length) throw new Error('Boot requires readiness tasks');
  let completed = 0, failed = false;
  onProgress({ completed, total: tasks.length });
  await Promise.all(tasks.map(async ({ name, run }) => {
    try {
      await run();
      if (!failed) onProgress({ completed: ++completed, total: tasks.length });
    } catch (cause) {
      failed = true;
      throw new Error(`${name}: ${cause?.message || cause}`, { cause });
    }
  }));
}

export function waitForPageResources(page) {
  if (page.document.readyState === 'complete') return Promise.resolve();
  return new Promise(resolve => page.addEventListener('load', resolve, { once: true }));
}

export async function decodeImage(image) {
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no decoded pixels');
}
