import { useCallback, useRef, useState } from 'react';

export function useImageCanvas() {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [zoom, setZoom] = useState(1);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageInfo({ name: file.name, width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const getImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return null;
    const off = document.createElement('canvas');
    off.width = imageRef.current.width;
    off.height = imageRef.current.height;
    off.getContext('2d', { willReadFrequently: true }).drawImage(imageRef.current, 0, 0);
    return off.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, off.width, off.height);
  }, []);

  return { canvasRef, imageRef, imageInfo, zoom, setZoom, loadFile, getImageData };
}
