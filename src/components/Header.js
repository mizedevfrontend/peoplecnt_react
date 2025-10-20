import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom"; // React Router Link 사용
import IonIcon from "../components/IonIcon";

const Header = ({ handleLogout }) => {
  const [currentDate, setCurrentDate] = useState(""); // 년월일
  const [currentTime, setCurrentTime] = useState(""); // 시분초
  const [userType, setUserType] = useState(() =>
    (localStorage.getItem("usertype") || "").toUpperCase()
  );
  const location = useLocation();

  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return {
      date: `${year}년 ${month}월 ${day}일`,
      time: `${hours}:${minutes}:${seconds}`,
    };
  };

  useEffect(() => {
    const now = new Date();
    const { date, time } = formatDateTime(now);
    setCurrentDate(date);
    setCurrentTime(time);

    const interval = setInterval(() => {
      const updatedTime = new Date();
      const { date, time } = formatDateTime(updatedTime);
      setCurrentDate(date);
      setCurrentTime(time);
    }, 1000);

    return () => clearInterval(interval); // 컴포넌트 언마운트 시 정리
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "usertype") {
        setUserType((e.newValue || "").toUpperCase());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <header className="header">
      <div className="logobox">
        {/* 로고가 있으면 저장되어 있는 로고 띄우고, 아니면 마이즈 로고 */}
        <img
          src={require("../images/logo_w.png")}
          alt="스마트 피플카운팅 시스템 로고"
        />
        <span>스마트 피플카운팅 시스템</span>
      </div>
      <div className="navbox">
        <ul>
          {/* 홈 , 실시간 현황, 방문내역 (오늘, 일별조회), 모니터링, 설정 ( 사업장관리, 장치관리 )*/}
          <NavLink
            to="/main/home"
            className={isActive("/main/home") ? "on" : ""}
          >
            <IonIcon
              name={isActive("/main/home") ? "IoHome" : "IoHomeOutline"}
              size={24}
            />{" "}
            홈
          </NavLink>
          <NavLink
            to="/dashboard"
            className={isActive("/dashboard") ? "on" : ""}
            // onClick={(e) => {
            //   e.preventDefault();
            //   window.location.href = "/dashboard";
            // }}
          >
            <IonIcon
              name={isActive("/dashboard") ? "IoGrid" : "IoGridOutline"}
              size={24}
            />{" "}
            실시간 현황
          </NavLink>
          <NavLink
            to="/visitlist"
            className={isActive("/visitlist") ? "on" : ""}
          >
            <IonIcon
              name={isActive("/visitlist") ? "IoPeople" : "IoPeopleOutline"}
              size={24}
            />
            방문내역
          </NavLink>
          <NavLink
            to="/realtimevideo"
            className={isActive("/realtimevideo") ? "on" : ""}
          >
            <IonIcon
              name={
                isActive("/realtimevideo") ? "IoVideocam" : "IoVideocamOutline"
              }
              size={24}
            />{" "}
            모니터링
          </NavLink>
          {/* ✅ 슈퍼관리자(S)에게만 보이도록 */}
          {userType === "S" && (
            <NavLink
              to="/management"
              className={isActive("/management") ? "on" : ""}
            >
              <IonIcon
                name={
                  isActive("/management") ? "IoSettings" : "IoSettingsOutline"
                }
                size={24}
              />{" "}
              설정
            </NavLink>
          )}
        </ul>
      </div>
      <div className="watchbox">
        <div className="date">{currentDate}</div>
        <div className="time">{currentTime}</div>
        <button onClick={handleLogout} className="logoutbtn">
          <IonIcon name="IoLogOutOutline" size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
