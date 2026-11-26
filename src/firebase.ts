import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
] as const;

export const googleProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => googleProvider.addScope(scope));

// In-memory only access token cache (never stored in localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;
const driveTokenListeners = new Set<(token: string | null) => void>();

const notifyDriveTokenListeners = () => {
  driveTokenListeners.forEach((cb) => cb(cachedDriveAccessToken));
};

export const setDriveAccessToken = (token: string | null) => {
  cachedDriveAccessToken = token;
  notifyDriveTokenListeners();
};

export const setDriveAccessTokenFromResult = (result: UserCredential | null): string | null => {
  if (!result) return null;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  if (token) {
    setDriveAccessToken(token);
  }
  return token;
};

export const getDriveAccessToken = (): string | null => cachedDriveAccessToken;

export const clearDriveAccessToken = () => {
  setDriveAccessToken(null);
};

export const subscribeDriveAccessToken = (cb: (token: string | null) => void): (() => void) => {
  driveTokenListeners.add(cb);
  cb(cachedDriveAccessToken);
  return () => {
    driveTokenListeners.delete(cb);
  };
};

// Clear cached access token whenever user signs out
onAuthStateChanged(auth, (firebaseUser) => {
  if (!firebaseUser) {
    clearDriveAccessToken();
  }
});

// Connect/re-authenticate Google Drive on user click to obtain an in-memory access token
export const connectGoogleDrive = async (): Promise<string | null> => {
  const driveProvider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach((scope) => driveProvider.addScope(scope));
  driveProvider.setCustomParameters({
    prompt: 'consent select_account',
  });

  const result = await signInWithPopup(auth, driveProvider);
  const token = setDriveAccessTokenFromResult(result);
  if (!token) {
    throw new Error('Token akses Google Drive tidak diterima dari Google.');
  }
  return token;
};

