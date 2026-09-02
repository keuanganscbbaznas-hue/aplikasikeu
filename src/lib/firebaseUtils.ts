import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export const FIRESTORE_PROJECT_ID = "gen-lang-client-0768292926";
export const FIRESTORE_DATABASE_ID = "ai-studio-1bb75171-ca3b-4771-a0ae-d25875d983cb";
export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${FIRESTORE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
export const FIRESTORE_PRICING_URL = "https://firebase.google.com/pricing#cloud-firestore";

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error instanceof Error) {
    msg = error.message;
  } else {
    try {
      msg = JSON.stringify(error);
    } catch {
      msg = String(error);
    }
  }
  return msg.includes('Quota limit exceeded') || 
         msg.includes('resource-exhausted') || 
         msg.includes('Free daily read units per project') ||
         msg.includes('Quota exceeded');
}

type ErrorListener = (errorInfo: FirestoreErrorInfo) => void;
const errorListeners: Set<ErrorListener> = new Set();

export function onFirestoreError(listener: ErrorListener) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawErrorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawErrorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  console.warn('Firestore Error Notice: ', JSON.stringify(errInfo));

  // Notify active UI listeners about the error (e.g. for quota banners)
  errorListeners.forEach(listener => {
    try {
      listener(errInfo);
    } catch (e) {
      console.error("Error in firestore error listener", e);
    }
  });

  // If this is a list / snapshot operation or a quota exhaustion, do not throw uncaught exception to avoid crashing listeners
  if (operationType === OperationType.LIST || isQuotaExceededError(error)) {
    return errInfo;
  }

  throw new Error(JSON.stringify(errInfo));
}

