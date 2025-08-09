
import { existsSync } from 'fs';
import { join } from 'path';
import { Storage } from './storage';

export interface FileValidationResult {
  isValid: boolean;
  exists: boolean;
  url: string;
  key: string | null;
  error?: string;
}

export class FileValidator {
  /**
   * Validate a file URL before saving to database
   */
  static async validateFileUrl(url: string): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: false,
      exists: false,
      url,
      key: null,
    };

    try {
      if (!url || typeof url !== 'string') {
        result.error = 'Invalid URL provided';
        return result;
      }

      // Extract key from URL
      const key = Storage.extractKeyFromUrl(url);
      if (!key) {
        result.error = 'Could not extract file key from URL';
        return result;
      }

      result.key = key;

      // Check if file exists locally (since we're using local storage)
      const filePath = join(process.cwd(), 'uploads', key);
      const exists = existsSync(filePath);
      
      result.exists = exists;
      result.isValid = exists;

      if (!exists) {
        result.error = `File does not exist at path: ${filePath}`;
      }

      return result;
    } catch (error) {
      result.error = `Validation error: ${error}`;
      return result;
    }
  }

  /**
   * Validate multiple file URLs
   */
  static async validateMultipleFileUrls(urls: string[]): Promise<FileValidationResult[]> {
    const promises = urls.map(url => this.validateFileUrl(url));
    return Promise.all(promises);
  }

  /**
   * Validate file before database save with automatic cleanup
   */
  static async validateAndCleanUrl(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;

    const validation = await this.validateFileUrl(url);
    
    // Return the URL only if it's valid, otherwise return null
    return validation.isValid ? url : null;
  }

  /**
   * Batch validate and clean URLs
   */
  static async validateAndCleanUrls(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
    const promises = urls.map(url => this.validateAndCleanUrl(url));
    return Promise.all(promises);
  }

  /**
   * Check if file exists by key
   */
  static fileExistsByKey(key: string): boolean {
    try {
      const filePath = join(process.cwd(), 'uploads', key);
      return existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file stats for validation
   */
  static async getFileStats(url: string): Promise<{
    exists: boolean;
    size?: number;
    path?: string;
    key?: string;
  }> {
    try {
      const key = Storage.extractKeyFromUrl(url);
      if (!key) {
        return { exists: false };
      }

      const filePath = join(process.cwd(), 'uploads', key);
      const exists = existsSync(filePath);

      if (!exists) {
        return { exists: false, key, path: filePath };
      }

      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);

      return {
        exists: true,
        size: stats.size,
        path: filePath,
        key,
      };
    } catch (error) {
      return { exists: false };
    }
  }
}

/**
 * Middleware to validate files before saving to Prisma
 */
export class PrismaFileValidationMiddleware {
  /**
   * Validate script data before saving
   */
  static async validateScriptFiles(scriptData: any): Promise<any> {
    const validatedData = { ...scriptData };

    // Validate cover image URL
    if (validatedData.coverImageUrl) {
      validatedData.coverImageUrl = await FileValidator.validateAndCleanUrl(validatedData.coverImageUrl);
    }

    return validatedData;
  }

  /**
   * Validate script file data before saving
   */
  static async validateScriptFileData(fileData: any): Promise<any> {
    const validatedData = { ...fileData };

    // Validate file URL
    if (validatedData.fileUrl) {
      const validation = await FileValidator.validateFileUrl(validatedData.fileUrl);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.error}`);
      }
    }

    return validatedData;
  }

  /**
   * Validate user data before saving
   */
  static async validateUserData(userData: any): Promise<any> {
    const validatedData = { ...userData };

    // Validate profile photo URL
    if (validatedData.photoUrl) {
      validatedData.photoUrl = await FileValidator.validateAndCleanUrl(validatedData.photoUrl);
    }

    return validatedData;
  }
}

/**
 * Development helpers for file validation
 */
export class FileValidationHelpers {
  /**
   * Generate a detailed validation report
   */
  static async generateValidationReport(urls: string[]): Promise<{
    total: number;
    valid: number;
    invalid: number;
    details: FileValidationResult[];
  }> {
    const results = await FileValidator.validateMultipleFileUrls(urls);
    
    return {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      details: results,
    };
  }

  /**
   * Log validation results for debugging
   */
  static logValidationResults(results: FileValidationResult[], prefix = 'File Validation'): void {
    console.log(`\n${prefix} Results:`);
    console.log(`Total files: ${results.length}`);
    console.log(`Valid files: ${results.filter(r => r.isValid).length}`);
    console.log(`Invalid files: ${results.filter(r => !r.isValid).length}`);
    
    const invalidFiles = results.filter(r => !r.isValid);
    if (invalidFiles.length > 0) {
      console.log('\nInvalid files:');
      invalidFiles.forEach((result, index) => {
        console.log(`${index + 1}. ${result.url}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Key: ${result.key || 'N/A'}`);
      });
    }
  }
}
