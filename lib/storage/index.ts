import { gridFsStorage } from './gridfs.storage';

export type { StorageDriver, StoredFile, StoredFileStream } from './storage.types';

/**
 * The one storage binding the app uses. Swapping the backend is swapping this line — nothing above
 * the storage layer names GridFS.
 */
export const storage = gridFsStorage;
