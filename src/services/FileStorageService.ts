/**
 * fileStorage.ts
 *
 * Client-side service for interacting with the file storage API.
 * - Supports uploads/downloads/listing/deleting of: notes, practice-tests, practicals, assignments
 * - Provides helpful logging and defensive error handling
 * - Exports `fileStorageService` singleton
 *
 * Usage:
 * import { fileStorageService, FileUploadData, StoredFile } from '../services/fileStorage';
 *
 * Notes:
 * The backend API is expected to expose endpoints similar to:
 *  - POST   /api/subjects
 *  - POST   /api/subjects/:subject/units
 *  - POST   /api/upload
 *  - DELETE /api/files/:subject/:type/:[unit]/:filename
 *  - GET    /api/files/:subject/:type/:[unit]
 *  - GET    /api/health
 *  - POST   /api/verify-files
 *  - GET    /api/storage-sync
 *  - DELETE /api/subjects/:subject
 *
 * Adjust API paths if your backend differs.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Safely parse a Response body as JSON, fallback to raw text.
 * Keeps callers from throwing if server returns non-JSON.
 */
const toJSON = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

/**
 * Allowed upload file mime types.
 * Add more if your backend supports them.
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif'
];

/**
 * Public upload data shape used by the admin UI.
 */
export interface FileUploadData {
  title: string;
  description: string;
  subject: string;
  unit?: string;

  // MUST include 'assignments' to support the new feature
  type: 'notes' | 'practice-tests' | 'practicals' | 'assignments';

  file: File;
}

/**
 * StoredFile returned by the server after upload.
 * Matches shape used by DataContext and AdminPanel.
 */
export interface StoredFile {
  id: string;
  title: string;
  description: string;
  fileName: string;
  storedFileName: string;
  fileSize: string;
  uploadDate: string;
  subject: string;
  unit?: string;
  type: 'notes' | 'practice-tests' | 'practicals' | 'assignments';
  filePath: string;
  fileType: 'pdf' | 'image';
}

/**
 * Minimal typed result wrapper from server endpoints.
 * Many endpoints follow the pattern: { success: boolean, ... }
 */
type ApiResult<T = any> = {
  success: boolean;
  message?: string;
  [k: string]: any;
} & T;

/**
 * FileStorageService
 *
 * Single class that encapsulates all remote interactions.
 */
class FileStorageService {
  /**
   * Generic wrapper for fetch calls with consistent error handling.
   * Throws on network errors or non-2xx responses with descriptive messages.
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers
        }
      });

      if (!response.ok) {
        // Attempt to read body to provide helpful error message
        const text = await response.text();
        let message = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          if (text && text.trim()) message = text;
        }

        const err = new Error(message);
        // Attach some helpful metadata for debugging
        (err as any).status = response.status;
        (err as any).statusText = response.statusText;
        throw err;
      }

      return response;
    } catch (err: any) {
      // Network errors (e.g. server down, CORS) often surface as TypeError from fetch
      if (err instanceof TypeError) {
        if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
          throw new Error('Unable to connect to server. Please check your API base URL and server status.');
        }
      }
      throw err;
    }
  }

  /**
   * Create a new subject on the server.
   * Returns true if server reports success, false otherwise.
   */
  async createSubject(name: string, units: string[]): Promise<boolean> {
    try {
      const res = await this.makeRequest(`${API_BASE_URL}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, units })
      });

      const json: ApiResult = await res.json();
      return !!json.success;
    } catch (e) {
      console.error('[fileStorage] createSubject failed:', e);
      return false;
    }
  }

  /**
   * Add a new unit under an existing subject.
   */
  async addUnit(subjectName: string, unitName: string): Promise<boolean> {
    try {
      const res = await this.makeRequest(
        `${API_BASE_URL}/subjects/${encodeURIComponent(subjectName)}/units`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitName })
        }
      );
      const json: ApiResult = await res.json();
      return !!json.success;
    } catch (e) {
      console.error('[fileStorage] addUnit failed:', e);
      return false;
    }
  }

  /**
   * Upload a file to the server.
   * Accepts FileUploadData and returns StoredFile on success.
   */
  async uploadFile(data: FileUploadData): Promise<StoredFile | null> {
    // Basic client-side validations
    if (!data || !data.file) {
      throw new Error('No file provided for upload.');
    }

    if (!ALLOWED_MIME_TYPES.includes(data.file.type)) {
      throw new Error('Only PDF and image files are allowed.');
    }

    // Build FormData
    const form = new FormData();
    form.append('file', data.file);
    form.append('title', data.title?.trim() || data.file.name);
    form.append('description', data.description?.trim() || '');
    form.append('subject', data.subject?.trim() || '');
    form.append('type', data.type);
    form.append('unit', data.unit?.trim() || '');

    // Good debug logging (can remove for production)
    console.info('[fileStorage] uploadFile start', {
      fileName: data.file.name,
      fileSize: data.file.size,
      fileType: data.file.type,
      subject: data.subject,
      type: data.type,
      unit: data.unit
    });

    try {
      const res = await this.makeRequest(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: form
      });

      const json: ApiResult & { file?: StoredFile } = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Upload failed');
      }

      // Validate returned file shape lightly
      if (!json.file) {
        throw new Error('Upload succeeded but server did not return file metadata.');
      }

      console.info('[fileStorage] uploadFile success', json.file);
      return json.file as StoredFile;
    } catch (err: any) {
      // Normalize common network/timeout messages where possible
      console.error('[fileStorage] uploadFile error:', err);
      if (err instanceof Error) throw err;
      throw new Error('Upload failed due to an unknown error.');
    }
  }

  /**
   * Delete a file from the server.
   * `type` can be 'notes' | 'practice-tests' | 'practicals' | 'assignments'
   * If the backend expects a unit in the path for notes, pass unit.
   */
  async deleteFile(subject: string, type: string, filename: string, unit?: string): Promise<boolean> {
    if (!subject || !type || !filename) {
      console.warn('[fileStorage] deleteFile called with missing params', { subject, type, filename, unit });
      return false;
    }

    let url = `${API_BASE_URL}/files/${encodeURIComponent(subject)}/${encodeURIComponent(type)}`;
    if (unit) url += `/${encodeURIComponent(unit)}`;
    url += `/${encodeURIComponent(filename)}`;

    console.info('[fileStorage] deleteFile URL:', url);

    try {
      const res = await this.makeRequest(url, { method: 'DELETE' });
      const json: ApiResult = await res.json();
      return !!json.success;
    } catch (e) {
      console.error('[fileStorage] deleteFile failed:', e);
      return false;
    }
  }

  /**
   * List files for a subject/type. If your backend requires unit for notes, pass it.
   * Returns an array (empty array on error).
   */
  async listFiles(subject: string, type: string, unit?: string): Promise<any[]> {
    if (!subject || !type) {
      console.warn('[fileStorage] listFiles called with missing params', { subject, type, unit });
      return [];
    }

    let url = `${API_BASE_URL}/files/${encodeURIComponent(subject)}/${encodeURIComponent(type)}`;
    if (unit) url += `/${encodeURIComponent(unit)}`;

    try {
      const res = await this.makeRequest(url);
      const json: ApiResult & { files?: any[] } = await res.json();
      return json.success ? (json.files || []) : [];
    } catch (e) {
      console.error('[fileStorage] listFiles failed:', e);
      return [];
    }
  }

  /**
   * Get a direct URL for a file on the server. Useful for <a href> or embed src.
   * Backend should expose static file routes matching this pattern.
   */
  getFileUrl(subject: string, type: string, filename: string, unit?: string): string {
    if (!subject || !type || !filename) {
      console.warn('[fileStorage] getFileUrl called with missing params', { subject, type, filename, unit });
      return '';
    }
    let url = `${API_BASE_URL}/files/${encodeURIComponent(subject)}/${encodeURIComponent(type)}`;
    if (unit) url += `/${encodeURIComponent(unit)}`;
    url += `/${encodeURIComponent(filename)}`;
    return url;
  }

  /**
   * Check server health quickly (returns boolean).
   * Times out after 5s to avoid long blocking checks.
   */
  async checkServerHealth(timeoutMs = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(t);

      if (!res.ok) {
        console.warn('[fileStorage] health check non-ok', res.status, res.statusText);
        return false;
      }
      const json: ApiResult = await res.json();
      return !!json.success;
    } catch (e) {
      console.error('[fileStorage] checkServerHealth failed:', e);
      return false;
    }
  }

  /**
   * Ask server to verify a list of file metadata. Useful if you want
   * to validate local state vs remote storage.
   */
  async verifyFiles(files: any[]): Promise<any[]> {
    try {
      const res = await this.makeRequest(`${API_BASE_URL}/verify-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });

      const json: ApiResult & { verifiedFiles?: any[] } = await res.json();
      return json.success ? (json.verifiedFiles || []) : [];
    } catch (e) {
      console.error('[fileStorage] verifyFiles failed:', e);
      return [];
    }
  }

  /**
   * Sync with server's storage structure (returns an object { storageStructure, backupData })
   * - Filters out 'temp' folder automatically
   * - Used by DataContext.syncWithServer
   */
  async syncWithServer(subject?: string): Promise<{ storageStructure: Record<string, any>; backupData: any | null }> {
    try {
      let url = `${API_BASE_URL}/storage-sync`;
      if (subject) url += `/${encodeURIComponent(subject)}`;

      const res = await this.makeRequest(url);
      const json = await res.json();

      if (!json.success || !json.storageStructure) {
        return { storageStructure: {}, backupData: null };
      }

      // Filter out 'temp' entries
      const filtered: Record<string, any> = {};
      for (const [subjectName, subjectData] of Object.entries(json.storageStructure)) {
        if (subjectName.toLowerCase() === 'temp') continue;
        filtered[subjectName] = subjectData;
      }

      return { storageStructure: filtered, backupData: json.backupData || null };
    } catch (e) {
      console.error('[fileStorage] syncWithServer failed:', e);
      return { storageStructure: {}, backupData: null };
    }
  }

  /**
   * Delete a subject folder and all associated files on the backend.
   * Note: backend must support this route and perform cascading deletion.
   */
  async deleteSubject(subjectName: string): Promise<boolean> {
    const clean = subjectName?.trim();
    if (!clean) {
      console.warn('[fileStorage] deleteSubject called with empty subjectName');
      return false;
    }

    const url = `${API_BASE_URL}/subjects/${encodeURIComponent(clean)}`;
    console.info('[fileStorage] deleteSubject URL:', url);

    try {
      const res = await fetch(url, { method: 'DELETE' });
      const payload = await toJSON(res);

      if (!res.ok) {
        console.error('[fileStorage] deleteSubject failed:', payload);
        return false;
      }

      // Expected payload: { success: true }
      return !!(payload && (payload as any).success);
    } catch (err) {
      console.error('[fileStorage] deleteSubject error:', err);
      return false;
    }
  }
}

/**
 * Export singleton instance used across the app.
 * Example:
 *  import { fileStorageService } from '../services/fileStorage';
 */
export const fileStorageService = new FileStorageService();
export default fileStorageService;

