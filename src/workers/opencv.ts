import cvModule from '@techstark/opencv-js';
import type { CV } from '@techstark/opencv-js';

export async function getOpenCv(): Promise<{ cv: CV }> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cv: CV = cvModule instanceof Promise ? await cvModule : cvModule;

  if (cv.Mat) {
    return { cv };
  }

  return new Promise((resolve) => {
    if (cv.Mat) {
      resolve({ cv });
      return;
    }

    cv.onRuntimeInitialized = () => {
      resolve({ cv });
    };
  });
}
