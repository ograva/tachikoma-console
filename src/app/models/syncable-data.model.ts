/**
 * Base interface for all Firestore-synced data
 * All documents must have an id and updatedAt timestamp for sync tracking
 */
export interface SyncableData {
  id: string;
  updatedAt: number;
  [key: string]: any;
}

/**
 * Helper function to check if an object implements SyncableData
 */
export function isSyncableData(obj: any): obj is SyncableData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.updatedAt === 'number'
  );
}
