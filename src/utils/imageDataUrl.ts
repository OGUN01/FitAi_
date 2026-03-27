import * as FileSystem from 'expo-file-system';

export interface ImageAssetLike {
  uri?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  base64?: string | null;
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

export const resolveImageMimeType = (
  assetOrPath?: Pick<ImageAssetLike, 'mimeType' | 'fileName' | 'uri'> | string | null
): string => {
  if (!assetOrPath) {
    return 'image/jpeg';
  }

  if (typeof assetOrPath !== 'string') {
    if (assetOrPath.mimeType?.startsWith('image/')) {
      return assetOrPath.mimeType;
    }

    const fromFileName = resolveImageMimeType(assetOrPath.fileName ?? null);
    if (fromFileName !== 'image/jpeg') {
      return fromFileName;
    }

    return resolveImageMimeType(assetOrPath.uri ?? null);
  }

  const cleanPath = assetOrPath.split('?')[0].split('#')[0];
  const extension = cleanPath.split('.').pop()?.toLowerCase();
  return (extension && MIME_TYPES_BY_EXTENSION[extension]) || 'image/jpeg';
};

export const buildImageDataUrl = (base64Data: string, mimeType: string): string =>
  `data:${mimeType};base64,${base64Data}`;

export const imageUriToDataUrl = async (
  imageUri: string,
  mimeType?: string | null
): Promise<string> => {
  if (!imageUri) {
    throw new Error('No image was captured. Please try again.');
  }

  if (imageUri.startsWith('data:image/')) {
    return imageUri;
  }

  try {
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64Data) {
      throw new Error('Empty image data');
    }

    return buildImageDataUrl(base64Data, resolveImageMimeType({ uri: imageUri, mimeType }));
  } catch (error) {
    console.error('Failed to convert image to data URL:', error);
    throw new Error('Failed to process the captured image. Please try again.');
  }
};

export const imageAssetToDataUrl = async (
  asset: ImageAssetLike | null | undefined
): Promise<string> => {
  if (!asset) {
    throw new Error('No image was captured. Please try again.');
  }

  const mimeType = resolveImageMimeType(asset);
  const inlineBase64 = asset.base64?.trim();
  if (inlineBase64) {
    return buildImageDataUrl(inlineBase64, mimeType);
  }

  if (!asset.uri) {
    throw new Error('No image was captured. Please try again.');
  }

  return imageUriToDataUrl(asset.uri, mimeType);
};
