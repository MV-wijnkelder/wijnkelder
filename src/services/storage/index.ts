import { ExcelStorageService } from "@/services/storage/excel-storage-service";
import type { StorageService as StorageServiceContract } from "@/services/storage/storage-service";

/** The configured storage service used by the UI. */
export const StorageService: StorageServiceContract = new ExcelStorageService();

export type { StorageService as StorageServiceContract } from "@/services/storage/storage-service";
