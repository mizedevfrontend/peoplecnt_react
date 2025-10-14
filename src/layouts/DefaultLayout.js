import React from "react";
import Header from "../components/Header";
import Left from "../components/Left";
import "../styles/layout.css";
//import Footer from "../components/Footer";

const DefaultLayout = ({ children, handleLogout }) => {
  return (
    <div className="container">
      <div className="wrapper">
        <Header handleLogout={handleLogout} />
        <div className="body">
          <Left />
          <div className="bodyright">
            {children}
            {/* <Footer /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultLayout;
