import React from 'react';
import { Image as RNImage } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

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

  return (
    <Image
      source={source}
      placeholder={defaultSource ? RNImage.resolveAssetSource(defaultSource) : undefined}
      style={style}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
      {...props}
    />
  );
};
