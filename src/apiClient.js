import axios from "axios";

// 기본 Axios 설정
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL, // .env에서 불러온 baseURL
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 (Optional)
apiClient.interceptors.request.use(
  (config) => {
    // 토큰 추가 (Optional)
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 (Optional)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 에러 처리
    return Promise.reject(error);
  }
);

export default apiClient;
