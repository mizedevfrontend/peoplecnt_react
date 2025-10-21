import React, { useEffect, useState, useCallback, useRef } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";
import IonIcon from "../components/IonIcon";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const dataBar = [
  { name: "9", in: 50, out: 100 },
  { name: "10", in: 100, out: 60 },
  { name: "11", in: 30, out: 80 },
  { name: "12", in: 160, out: 120 },
  { name: "13", in: 120, out: 100 },
  { name: "14", in: 10, out: 70 },
  { name: "15", in: 40, out: 30 },
  { name: "16", in: 0, out: 0 },
  { name: "17", in: 0, out: 0 },
  { name: "18", in: 0, out: 0 },
];
const dataLine = [
  { name: "9", in: 50 },
  { name: "10", in: 100 },
  { name: "11", in: 30 },
  { name: "12", in: 160 },
  { name: "13", in: 120 },
  { name: "14", in: 10 },
  { name: "15", in: 40 },
  { name: "16", in: 0 },
  { name: "17", in: 0 },
  { name: "18", in: 0 },
];

const DashBoard = () => {
  const { selectedWorkplaceId } = useWorkplace();

  return (
    <div className="right">
      {/* 본문 테이블 */}
      <div className="content">
        <div className="dashboard_wrapper">
          <div className="device_selectbox">
            <button className="device_name on">
              <IonIcon name="IoStatsChart" size={30} />
              장치이름이다
            </button>
            <button className="device_name">
              <IonIcon name="IoStatsChart" size={30} />
              장치이름이다
            </button>
            <button className="device_name">
              <IonIcon name="IoStatsChart" size={30} />
              장치이름이다
            </button>
          </div>
          <div className="top_wrapper">
            <div className="top_column">
              <div className="top_row box">
                <div className="box_titlebox">오늘 총 방문</div>
                <div className="box_row">
                  <div className="numbox">
                    <div className="number">314</div>
                    <div className="unit">명</div>
                  </div>
                  <div className="box_column">
                    <div className="innerbox averagepadding">
                      <div className="label">오전</div>
                      <div className="numbox_small">
                        <div className="number">120</div>
                        <div className="unit">명</div>
                      </div>
                    </div>
                    <div className="innerbox averagepadding">
                      <div className="label">오후</div>
                      <div className="numbox_small">
                        <div className="number">194</div>
                        <div className="unit">명</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="top_row box">
                <div className="box_titlebox">직전 1시간</div>
                <div className="innerbox trans nomargin">
                  <div className="innerbox averagepadding">
                    <div className="label">입장</div>
                    <div className="numbox_small">
                      <div className="number">194</div>
                      <div className="unit">명</div>
                    </div>
                  </div>
                  <div className="innerbox averagepadding">
                    <div className="label">퇴장</div>
                    <div className="numbox_small">
                      <div className="number">194</div>
                      <div className="unit">명</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="top_column box">
              <div className="box_titlebox">현재체류현황</div>
              <div className="summarys innerbox">
                <div className="summary ">
                  <div className="summary_label">최다인원:</div>
                  <div className="summary_data">오후 2시</div>
                </div>
                <div className="summary">
                  <div className="summary_label">최저인원:</div>
                  <div className="summary_data">오전 10시</div>
                </div>
              </div>
              <div className="graph_type1">
                <LineChart
                  width="100%"
                  height="100%"
                  data={dataLine}
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <YAxis dataKey="name" domain={[0, 160]} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="in" stroke="#82ca9d" />
                </LineChart>
              </div>
            </div>
          </div>
          <div className="bottom_wrapper box">
            <div className="box_titlebox">시간대별 입출입 현황</div>
            <div className="legends">
              <div className="legend">
                <div className="color_box color_in"></div>
                <div className="label">입장 수</div>
              </div>
              <div className="legend">
                <div className="color_box color_out"></div>
                <div className="label">퇴장 수</div>
              </div>
            </div>
            <div className="graph_type2">
              <BarChart
                width="100%"
                height="100%"
                data={dataBar}
                barCategoryGap="30%"
                barGap={5}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="in" fill="#8884d8" />
                <Bar dataKey="out" fill="#82ca9d" />
              </BarChart>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;
