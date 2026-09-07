import logo from './assets/pelican-mark.png?inline';
import { OUTFIT_THUMBNAILS } from './outfit-thumbnails.js';
import { decodeImage, runBootTasks, waitForPageResources } from './boot-tasks.js';

export function failBoot(error, copy) {
  window.__pelicanBoot.fail(error, copy);
}

export async function finishBoot(engine, copy) {
  const boot = window.__pelicanBoot;
  boot.setCopy(copy);
  const images = [];
  try {
    const urls = [...new Set([logo, ...Object.values(OUTFIT_THUMBNAILS.options).flatMap(Object.values)])];
    const tasks = urls.map((src, index) => ({ name: `Image ${index + 1}`, run: () => {
      const image = new Image();
      images.push(image);
      image.src = src;
      return decodeImage(image);
    } }));
    // Project images are listed above and fonts are system fonts; ignore unrelated page images and fonts.
    const pageLoaded = waitForPageResources(window);
    tasks.push(
      { name: 'Page resources', run: () => pageLoaded },
      { name: '3D first frame', run: () => engine.whenReady() },
    );
    await runBootTasks(tasks, progress => boot.progress(progress));
    boot.complete();
  } catch (error) {
    console.error('Boot failed', error);
    failBoot(error);
  } finally {
    images.length = 0;
  }
}
