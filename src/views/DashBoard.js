import React, { useEffect, useState, useCallback, useRef } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";
import IonIcon from "../components/IonIcon";

const DashBoard = () => {
  const { selectedWorkplaceId } = useWorkplace();

  return (
    <div className="right">
      {/* 본문 테이블 */}
      <div className="content">
        <div className="tablebox">
          <div className="info"></div>

          <div className="table-container"></div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;
