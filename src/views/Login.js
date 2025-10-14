import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../apiClient"; // API 클라이언트

const Login = ({ setIsAuthenticated }) => {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // 에러 메시지 상태
  const navigate = useNavigate();

  const incrementFailCount = async () => {
    try {
      await apiClient.post("/api/Auth/login-fail", { userid });
    } catch (err) {
      console.error("Fail count update failed:", err);
      // 실패해도 UI에는 영향 없으니 무시
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // 입력값 검증
    if (!userid) {
      setErrorMessage("아이디를 입력해주세요.");
      return;
    }
    if (!password) {
      setErrorMessage("비밀번호를 입력해주세요.");
      return;
    }

    try {
      const response = await apiClient.post("/api/Auth/login", {
        userid,
        password,
      });

      if (response.data.message === "user login success") {
        console.log(response.data.user);

        localStorage.setItem("userid", response.data.user.UserId);
        localStorage.setItem("username", response.data.user.AdminName);
        localStorage.setItem("usertype", response.data.user.UserType);
        localStorage.setItem("workplaceid", response.data.user.WorkplaceId);

        // 로그인 후 EntryExit 페이지로 이동
        setIsAuthenticated(true);
        navigate("/entryexit");
      } else {
        // 비밀번호가 실패시만 count 진행
        if (response.data.message === "비밀번호가 일치하지 않습니다.") {
          setErrorMessage(
            "비밀번호가 일치하지 않습니다. (5회 이상 실패시 계정 비활성화 처리됩니다.)"
          );
          await incrementFailCount();
        } else if (response.data.message === "5회 이상 로그인 실패") {
          setErrorMessage("계정 비활성화 처리 (5회 이상 실패)");
        } else setErrorMessage(response.data.message);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("서버 통신 오류입니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="login_wrapper">
      <div className="loginbox">
        <h1 className="login_title">MIZE People Counting</h1>
        <div className="login_desc">관리자 로그인</div>
        {errorMessage && (
          <div className="login_errormsg">{errorMessage}</div>
        )}{" "}
        {/* 에러 메시지 표시 */}
        <form onSubmit={handleLogin} name="login">
          <div className="login_inputbox">
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              className="login_input"
            />
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login_input"
            />
            <button type="submit" className="login_button">
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
