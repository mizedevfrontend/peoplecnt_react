import React, { useEffect, useRef, useState } from "react";
import flvjs from "flv.js";

const CameraViewer = ({ streamUrl }) => {
  const videoRef = useRef(null);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    if (flvjs.isSupported() && !player) {
      const newPlayer = flvjs.createPlayer({
        type: "flv",
        url: streamUrl,
        isLive: true,
        cors: true,
      });

      newPlayer.attachMediaElement(videoRef.current);
      newPlayer.load();
      newPlayer.play().catch((error) => {
        console.error("Video play error:", error);
      });

      setPlayer(newPlayer);
    }

    return () => {
      if (player) {
        player.destroy();
        setPlayer(null);
      }
    };
  }, [streamUrl]);

  return (
    <div>
      <video
        ref={videoRef}
        controls
        autoPlay
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
};

export default CameraViewer;
