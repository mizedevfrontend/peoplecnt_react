export const captureFrame = (video) =>
  new Promise((resolve) => {
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
