import { resolve } from 'path';
import { existsSync } from 'fs';
import { PreviewRequest, PreviewResponse, PreviewStore, Results } from './types';
import { formatTimestampForFilename } from './file-utils';
import { createLogger } from './logger';

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
  
  if (!req.student_id || typeof req.student_id !== 'string') {
    return { valid: false, error: 'Missing required field: student_id' };
  }
  
  if (!req.file_path || typeof req.file_path !== 'string') {
    return { valid: false, error: 'Missing required field: file_path' };
  }
  
  return { valid: true };
}

/**
 * Preview handler - stores data for browser preview (fast response)
 * Does NOT generate files, just stores data and returns preview_url
 * @param serverPort - Port for the unified server (changed from vitePort)
 */
export async function handlePreviewRequest(
  request: unknown,
  previewStore: PreviewStore,
  serverPort: number,
  verbose: boolean = false
): Promise<PreviewResponse> {
  const logger = createLogger(verbose, 'preview-handler');

  // Step 1: Validate request parameters
  const validation = validateRequest(request);
  if (!validation.valid) {
    logger.error(`Validation failed: ${validation.error}`);
    return {
      status: 'error',
      message: validation.error || 'Invalid request',
      data: null,
    };
  }

  const req = request as PreviewRequest;
  const { student_id, file_path } = req;

  logger.info(`Creating preview for student: ${student_id}`);
  logger.verbose(`File path: ${file_path}`);

  // Step 2: Validate file_path exists
  const absoluteFilePath = resolve(file_path);
  if (!existsSync(absoluteFilePath)) {
    logger.error(`File not found: ${absoluteFilePath}`);
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
    logger.verbose('JSON structure validated');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`JSON parsing failed: ${errorMsg}`);
    return {
      status: 'error',
      message: `Invalid JSON: ${errorMsg}`,
      data: null,
    };
  }

  // Step 4: Generate timestamp and store data
  const timestamp = Date.now();
  const formattedTimestamp = formatTimestampForFilename(timestamp);
  const storeKey = `${student_id}-${formattedTimestamp}`;
  const previewUrl = `http://localhost:${serverPort}/report/${student_id}/${formattedTimestamp}`;
  
  previewStore.set(storeKey, {
    student_id,
    timestamp,
    data: jsonData,
    createdAt: Date.now(),
  });
  
  logger.verbose(`Stored preview data with key: ${storeKey}`);
  logger.info(`Preview URL: ${previewUrl}`);

  return {
    status: 'success',
    message: null,
    data: {
      id: student_id,
      timestamp,
      results: {
        url: previewUrl,
        png: '',
        pdf: '',
      } as Results,
    },
  };
}