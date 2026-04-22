import { resolve } from 'path';
import { existsSync } from 'fs';
import { PreviewRequest, PreviewResponse, PreviewStore, Results } from './types';
import { formatTimestampForFilename } from './file-utils';
import { previewLogger } from './logger';

/**
 * Validates that the JSON file has required structure
 */
function validateJsonStructure(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    'mbti' in obj &&
    'multiple_intelligences' in obj &&
    'student_value' in obj
  );
}

/**
 * Validates request parameters
 */
function validateRequest(request: unknown): { valid: boolean; error?: string } {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const req = request as Record<string, unknown>;
  
  if (!req.userid || typeof req.userid !== 'string') {
    return { valid: false, error: 'Missing required field: userid' };
  }
  
  if (!req.filepath || typeof req.filepath !== 'string') {
    return { valid: false, error: 'Missing required field: filepath' };
  }
  
  return { valid: true };
}

/**
 * Preview handler - stores data for browser preview (fast response)
 * Does NOT generate files, just stores data and returns preview_url
 * @param serverPort - Port for the API server
 * @param devMode - If true, preview URL uses Vite port (serverPort + 1)
 */
export async function handlePreviewRequest(
  request: unknown,
  previewStore: PreviewStore,
  serverPort: number,
  verbose: boolean = false,
  devMode: boolean = false
): Promise<PreviewResponse> {
  const logger = previewLogger;

  // Step 1: Validate request parameters
  const validation = validateRequest(request);
  if (!validation.valid) {
    logger.error('Validation failed: {error}', { error: validation.error });
    return {
      status: 'error',
      message: validation.error || 'Invalid request',
      data: null,
    };
  }

  const req = request as PreviewRequest;
  const { userid, filepath } = req;

  logger.info('Creating preview for student: {userid}', { userid });
  logger.debug('File path: {filepath}', { filepath });

  // Step 2: Validate filepath exists
  const absoluteFilePath = resolve(filepath);
  if (!existsSync(absoluteFilePath)) {
    logger.error('File not found: {path}', { path: absoluteFilePath });
    return {
      status: 'error',
      message: `File not found: ${absoluteFilePath}`,
      data: null,
    };
  }

  // Step 3: Read and validate JSON structure
  let jsonData: Record<string, unknown>;
  try {
    const fileContent = await Bun.file(absoluteFilePath).text();
    jsonData = JSON.parse(fileContent);
    
    if (!validateJsonStructure(jsonData)) {
      logger.error('Invalid data: missing required fields');
      return {
        status: 'error',
        message: 'Invalid data: missing required fields (mbti, multiple_intelligences, student_value)',
        data: null,
      };
    }
    logger.debug('JSON structure validated');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('JSON parsing failed: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `Invalid JSON: ${errorMsg}`,
      data: null,
    };
  }

  // Step 4: Generate timestamp and store data
  const timestamp = Date.now();
  const formattedTimestamp = formatTimestampForFilename(timestamp);
  const storeKey = `${userid}-${formattedTimestamp}`;
  // In dev mode, preview URL should use Vite port (serverPort + 1)
  // In production mode, preview URL uses the same server port
  const previewPort = devMode ? serverPort + 1 : serverPort;
  const previewUrl = `http://localhost:${previewPort}/report/${userid}/${formattedTimestamp}`;
  
  previewStore.set(storeKey, {
    userid,
    timestamp,
    data: jsonData,
    createdAt: Date.now(),
  });
  
  logger.debug('Stored preview data with key: {storeKey}', { storeKey });
  logger.info('Preview URL: {url}', { url: previewUrl });

  return {
    status: 'success',
    message: null,
    data: {
      id: userid,
      timestamp,
      results: {
        url: previewUrl,
        png: '',
        pdf: '',
      } as Results,
    },
  };
}
