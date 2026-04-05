import React from 'react';
import { Image as RNImage } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

const FALLBACK_IMAGE = 'https://via.placeholder.com/150/1a1a1a/666666?text=♪';

interface CachedImageProps {
  source: { uri: string } | number;
  defaultSource?: number;
  style?: any;
  contentFit?: ImageContentFit;
  [key: string]: any;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  defaultSource,
  style,
  contentFit = 'cover',
  ...props
}) => {
  // Handle require() for local assets
  if (typeof source === 'number') {
    return <RNImage source={source} style={style} {...props} />;
  }

  // Validate URI
  const uri = source?.uri;
  const isValidUri = uri && typeof uri === 'string' && uri.startsWith('http');
  const finalSource = isValidUri ? source : { uri: FALLBACK_IMAGE };

  return (
    <Image
      source={finalSource}
      placeholder={defaultSource ? RNImage.resolveAssetSource(defaultSource) : undefined}
      style={style}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
      {...props}
    />
  );
};
