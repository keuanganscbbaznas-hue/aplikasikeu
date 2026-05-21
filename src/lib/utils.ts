import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function resizeImage(file: File, maxWidth = 200, maxHeight = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Returns the correct API URL depending on where the app is being hosted.
 * If running on Vercel or other static hosting, routes requests to the deployed Cloud Run agent.
 */
export function getApiUrl(path: string): string {
  const origin = window.location.origin;
  if (
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    origin.includes('run.app')
  ) {
    return path;
  }
  // The official preview URL of this app on Cloud Run:
  const backendBase = 'https://ais-pre-rge4zik6fjg47xle5dw4di-640128737071.asia-southeast1.run.app';
  return `${backendBase}${path}`;
}
