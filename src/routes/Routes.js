import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { WorkplaceProvider } from "../context/WorkplaceContext";
import DefaultLayout from "../layouts/DefaultLayout";
import Login from "../views/Login";
import VisitList from "../views/VisitList";
import DashBoard from "../views/DashBoard";
import Management from "../views/Management";
import MainHome from "../views/MainHome";
import RealtimeVideo from "../views/RealtimeVideo";

const AppRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("userid")
  );

  const handleLogout = () => {
    localStorage.removeItem("userid");
    localStorage.removeItem("username");
    localStorage.removeItem("usertype");
    localStorage.removeItem("workplaceid");

    setIsAuthenticated(false); // 인증 상태 업데이트
  };

  return (
    <WorkplaceProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="dashboard" />
              ) : (
                <Login setIsAuthenticated={setIsAuthenticated} />
              )
            }
          />

          {isAuthenticated ? (
            <>
              <Route
                path="/*"
                element={
                  <DefaultLayout handleLogout={handleLogout}>
                    <Routes>
                      {/* 홈 */}
                      <Route path="main/home" element={<MainHome />} />
                      {/* 실시간 현황 */}
                      <Route path="dashboard" element={<DashBoard />} />
                      {/* 방문내역 */}
                      <Route path="visitlist" element={<VisitList />} />
                      {/* 설정 */}
                      <Route path="management" element={<Management />} />
                      {/* 모니터링 */}
                      <Route path="realtimevideo" element={<RealtimeVideo />} />
                    </Routes>
                  </DefaultLayout>
                }
              />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
      </Router>
    </WorkplaceProvider>
  );
};

export default AppRoutes;
