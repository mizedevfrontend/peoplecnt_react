/**
 * React helper – 비디오 화면을 duration(초)만큼 녹화해 *.webm* 파일로 저장
 *
 * @param {HTMLVideoElement} videoEl  녹화할 <video> 요소
 * @param {string}           fileName 저장할 파일명 (확장자 제외)
 * @param {number}           duration 녹화 길이(초) – 기본 10
 */
export function recordingVideo(videoEl, fileName = "cctv", duration = 10) {
  if (!videoEl) return;

  // ① 캔버스 준비
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = videoEl.videoWidth || 600;
  canvas.height = videoEl.videoHeight || 400;

  // ② MediaRecorder 세팅 (30 FPS)
  const stream = canvas.captureStream(30);
  const recorderChunks = [];
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size) recorderChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recorderChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start(1000); // 1 초마다 dataavailable 발생

  // ③ 프레임 복사 루프
  const drawFrame = () => {
    if (mediaRecorder.state === "recording") {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    }
  };
  drawFrame();

  // ④ duration 초 후 자동 종료
  setTimeout(() => {
    if (mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  }, duration * 1000);
}
