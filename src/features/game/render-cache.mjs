export function createRenderCache(createSurface, freezeSurface) {
  return {
    dragons: new Map(),
    lasers: new Map(),
    freezeSurface:
      freezeSurface || ((canvas) => canvas.transferToImageBitmap?.() || canvas),
    createSurface:
      createSurface ||
      ((w, h) => {
        if (typeof OffscreenCanvas !== "undefined")
          return new OffscreenCanvas(w, h);
        if (typeof document === "undefined") return null;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        return canvas;
      }),
  };
}

export function cachedArtwork(cache, collection, key, w, h, paint) {
  if (!cache) return null;
  const images = cache[collection];
  if (images.has(key)) return images.get(key);
  const canvas = cache.createSurface(w * 2, h * 2);
  const context = canvas?.getContext("2d");
  if (!context) return null;
  context.scale(2, 2);
  paint(context);
  // Immutable bitmaps avoid copying a mutable canvas for every sprite draw.
  const image = cache.freezeSurface(canvas);
  images.set(key, image);
  return image;
}
