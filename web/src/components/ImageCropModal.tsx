"use client";

import { useState, useCallback } from "react";
import Crop from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

interface ImageCropModalProps {
  imageUrl: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  imageUrl,
  onCropComplete,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropAreaChange = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (err) => reject(err));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, "image/jpeg", 0.9);
    });
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error("Crop error:", error);
      alert("トリミング処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background border border-foreground/10 rounded-lg max-w-2xl w-full shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 p-4">
          <h2 className="text-lg font-bold text-foreground">アバター画像のトリミング</h2>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="text-foreground/70 hover:text-foreground transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative w-full h-80 md:h-96 bg-black/20">
          <Crop
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropAreaChange={handleCropAreaChange}
            onZoomChange={setZoom}
            restrictPosition={true}
          />
        </div>

        {/* Controls */}
        <div className="border-t border-foreground/10 p-4 space-y-4">
          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-foreground/70" />
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                disabled={isProcessing}
                className="flex-1 h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-foreground"
              />
              <ZoomIn className="h-4 w-4 text-foreground/70" />
              <span className="text-sm text-foreground/70 w-12 text-right">
                {(zoom * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-foreground/60">
              ズームレベルを調整してください。ドラッグで位置移動も可能です。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 rounded-md border border-foreground/15 text-foreground hover:bg-foreground/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-4 py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? "処理中..." : "確定してアップロード"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
