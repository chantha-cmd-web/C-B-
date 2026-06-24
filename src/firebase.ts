import { initializeApp } from 'firebase/app';
import { getStorage, ref, getBlob } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC_SjrFs-PvlTYpiOgI3Spl4FpRz36zD5M',
  authDomain: 'project-0b4113c8-b2dc-4744-aea.firebaseapp.com',
  projectId: 'project-0b4113c8-b2dc-4744-aea',
  storageBucket: 'project-0b4113c8-b2dc-4744-aea.firebasestorage.app',
  messagingSenderId: '845080548230',
  appId: '1:845080548230:web:b5df748606172f80e11207',
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadPdf(_collection: string, file: File): Promise<{ url: string; name: string }> {
  const MAX_SIZE = 700 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File exceeds ${Math.round(MAX_SIZE / 1024)}KB limit. Try a smaller PDF.`);
  }
  const url = await readFileAsDataUrl(file);
  return { url, name: file.name };
}

export async function getPdfBlobUrl(fileData: string): Promise<string> {
  if (fileData.startsWith("https://firebasestorage.googleapis.com")) {
    const storageRef = ref(storage, fileData);
    const blob = await getBlob(storageRef);
    return URL.createObjectURL(blob);
  }
  const res = await fetch(fileData);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
