const NodeMediaServer = require("node-media-server");

const config = {
  rtmp: {
    port: 1935, // RTMP 서버 포트
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8080, // HTTP FLV 스트리밍 포트
    allow_origin: "*",
  },
  trans: {
    ffmpeg: "C:/ffmpeg-2025-02-20-git-bc1a3bfd2c-full_build/bin/ffmpeg.exe", // Windows 사용자는 "C:/ffmpeg/bin/ffmpeg.exe"로 변경
    tasks: [
      {
        app: "live",
        ac: "aac",
        vc: "h264",
        hls: true,
        hlsFlags: "[hls_time=2:hls_list_size=3:hls_flags=delete_segments]",
        dash: false,
      },
    ],
  },
};

const nms = new NodeMediaServer(config);
nms.run();

console.log("📡 Node Media Server 실행 중...");
