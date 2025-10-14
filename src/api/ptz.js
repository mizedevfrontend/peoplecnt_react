import { instance } from "../api";

export function fetchPTZMoveControl(channel, direction, speed) {
  return instance.post(
    `ptz/${channel}/move/${direction}`,
    {},
    {
      params: { speed },
    }
  );
}

export function fetchPTZZoomControl(channel, mode) {
  return instance.post(`ptz/${channel}/zoom/${mode}`);
}
