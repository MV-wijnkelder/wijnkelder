import type { Wine } from "@/domain/wine";
import type { StorageService } from "@/services/storage/storage-service";

/**
 * Excel-backed storage provider.
 *
 * The first implementation deliberately simulates persistence. OneDrive,
 * Microsoft Graph, and actual Excel writes will be added in a later sprint.
 */
export class ExcelStorageService implements StorageService {
  async addWine(wine: Wine): Promise<boolean> {
    console.info("Simulating save of wine to Excel:", wine);

    return true;
  }
}
