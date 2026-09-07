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
  const styles = [...page.document.querySelectorAll('link[rel="stylesheet"][data-boot-required]')];
  return Promise.all(styles.map(style => new Promise((resolve, reject) => {
    const cleanup = () => {
      style.removeEventListener('load', loaded);
      style.removeEventListener('error', failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(`Resource failed: ${style.href}`)); };
    if (style.dataset.bootState === 'loaded') loaded();
    else if (style.dataset.bootState === 'error') failed();
    else {
      style.addEventListener('load', loaded);
      style.addEventListener('error', failed);
    }
  })));
}

export async function decodeImage(image) {
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no decoded pixels');
}
