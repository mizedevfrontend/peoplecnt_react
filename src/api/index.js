import apiClient from "../apiClient";

const baseURLs = {
  1: "https://211-185-142-193.nip.io/api/", // 정선 동강지중화 현장
  //1: "http://211.185.142.193:8083/api/", // 정선 동강지중화 현장
  2: "http://192.168.0.2:8083/api/", // 포스코타워 송도 현장
  3: "", // 남구현장
};

function getWorkplaceId() {
  return localStorage.getItem("selectedWorkplaceId") || "1";
}

function createInstance(url = "") {
  const workplaceId = getWorkplaceId();
  //alert(workplaceId);
  const baseURL = baseURLs[workplaceId] || baseURLs["1"];

  return apiClient.create({
    baseURL: `${baseURL}${url}`,
  });
}

export const instance = createInstance();
