import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useWorkplace } from "../context/WorkplaceContext";
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

const DashBoard = () => {
  const { selectedWorkplaceId } = useWorkplace();

  const DASHBOARD_API = {
    DEVICE_LIST: "/api/Device/workplace-device-list",
    DASHBOARD_INFO: "/api/DashBoard/dashboard-info",
  };
  const getStatus = (err) => err?.response?.status ?? err?.status ?? null;
  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const [currentStayList, setCurrentStayList] = useState([]);
  const [hourInoutList, setHourInOutList] = useState([]);
  const [deviceList, setDeviceList] = useState([]); // [{eqTableId, locationName}]
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [devicePage] = useState(1); // 필요시 페이징 확장
  const [selectedEqTableId, setSelectedEqTableId] = useState(null); // null = 전체/미선택
  const [ttActive, setTtActive] = useState(false);
  const [ttPos, setTtPos] = useState({ x: 0, y: 0 });
  // 장치 목록 가져오기
  const fetchDeviceList = useCallback(async () => {
    if (!selectedWorkplaceId) return;
    try {
      const body = {
        Page: devicePage,
        PageSize: 10,
        OrderType: "name_asc",
        WorkplaceId: selectedWorkplaceId,
        LoginUserId: localStorage.getItem("userid"),
      };
      const res = await apiClient.post(DASHBOARD_API.DEVICE_LIST, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;

      const rows = (data?.data ?? []).map((d) => ({
        eqTableId: d.eqTableId,
        locationName: d.locationName,
      }));

      setDeviceList(rows);
      setDeviceTotal(data?.meta?.totalCount ?? rows.length);
      //setSelectedEqTableId((prev) => prev ?? rows[0]?.eqTableId ?? null);
      setSelectedEqTableId((prev) => {
        const exists = rows.some((r) => r.eqTableId === prev);
        return exists ? prev : rows[0]?.eqTableId ?? null;
      });
    } catch (err) {
      console.error("[ERR] DEVICE_LIST", getStatus(err), err);
      setDeviceList([]);
      setDeviceTotal(0);
      setSelectedEqTableId(null);
    }
  }, [DASHBOARD_API.DEVICE_LIST, devicePage, selectedWorkplaceId]);

  useEffect(() => {
    // workplace가 바뀌면 이전 eq 선택을 지워서
    // 새 목록이 올 때 rows[0]로 자연스럽게 맞춰지게 함
    setSelectedEqTableId(null);
    fetchDeviceList();
  }, [fetchDeviceList]);

  const [board, setBoard] = useState({
    TodayIn: "0",
    MorningIn: "0",
    AfterNoonIn: "0",
    WindowStart: "",
    WindowEnd: "",
    HourLabel: "", // 예: '오후 2시 36분 기준'
    AgoHourInCnt: "0",
    AgoHourOutCnt: "0",
  });

  // 대시보드 데이터 채우기
  const fetchDashboardInfo = useCallback(async () => {
    if (!selectedWorkplaceId || !selectedEqTableId) return;

    try {
      const payload = {
        WorkplaceId: selectedWorkplaceId,
        EqTableId: selectedEqTableId, // 장치 기준 데이터면 포함
        LoginUserId: localStorage.getItem("userid"),
      };

      const res = await apiClient.post(DASHBOARD_API.DASHBOARD_INFO, payload);
      const json =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      const item = json?.data?.[0] ?? {};

      console.log(res.data);
      // API가 단일 객체를 주는 것으로 가정

      const stayList =
        item?.currentStayList?.map((row) => ({
          name: row.name,
          in: Number(row.stayCnt) || 0,
        })) ?? [];

      setCurrentStayList(stayList);

      const inoutList =
        item?.hourInOutList?.map((row) => ({
          name: row.name,
          in: Number(row.inCnt) || 0,
          out: Number(row.outCnt) || 0,
        })) ?? [];

      setHourInOutList(inoutList);

      setBoard({
        TodayIn: item?.todayIn ?? "0",
        MorningIn: item?.morningIn ?? "0",
        AfterNoonIn: item?.afterNoonIn ?? "0",
        WindowStart: item?.windowStart ?? "",
        WindowEnd: item?.windowEnd ?? "",
        HourLabel: item?.hourLabel ?? "",
        AgoHourInCnt: item?.agoHourInCnt ?? "0",
        AgoHourOutCnt: item?.agoHourOutCnt ?? "0",
        MaxHourTime: item?.maxHourTime ?? "-",
        MinHourTime: item?.minHourTime ?? "-",
      });
    } catch (err) {
      console.error("[ERR] DASHBOARD_INFO", getStatus(err), err);
      // 실패 시 0으로 초기화
      setBoard((s) => ({
        ...s,
        TodayIn: "0",
        MorningIn: "0",
        AfterNoonIn: "0",
        AgoHourInCnt: "0",
        AgoHourOutCnt: "0",
        MaxHourTime: "-",
        MinHourTime: "-",
      }));
      setCurrentStayList([]);
      setHourInOutList([]);
    }
  }, [DASHBOARD_API.DASHBOARD_INFO, selectedWorkplaceId, selectedEqTableId]);

  // 장치 선택/사업장 변경 시 대시보드 재조회
  useEffect(() => {
    fetchDashboardInfo();
  }, [fetchDashboardInfo]);

  // ✅ 1초 폴링용 ref
  const pollRef = useRef(null);

  // 페이지 가시성에 따라 폴링 일시중지/재개
  const handleVisibility = useCallback(() => {
    if (document.visibilityState === "hidden") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } else {
      // 보이게 되면 즉시 1회 호출 후 재시작
      fetchDashboardInfo();
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchDashboardInfo, 1000);
      }
    }
  }, [fetchDashboardInfo]);

  // ⚡ 폴링 스타트/클린업
  useEffect(() => {
    // 장치/사업장 선택이 준비되어야만 시작
    if (!selectedWorkplaceId || !selectedEqTableId) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // 즉시 1회 호출
    fetchDashboardInfo();

    // 1초 간격 폴링 시작
    if (!pollRef.current) {
      pollRef.current = setInterval(fetchDashboardInfo, 1000);
    }

    // 탭 전환/브라우저 숨김 대응
    document.addEventListener("visibilitychange", handleVisibility);

    // 의존성(장치/사업장/콜백) 바뀌면 타이머 재설정
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    selectedWorkplaceId,
    selectedEqTableId,
    fetchDashboardInfo,
    handleVisibility,
  ]);

  const maxYValue = useMemo(() => {
    if (!currentStayList?.length) return 60;

    const maxIn = Math.max(...currentStayList.map((d) => Number(d.in) || 0));
    if (maxIn === 0) return 60;

    // 1️⃣ 일단 10단위로 올림
    let adjusted = Math.ceil(maxIn / 10) * 10;

    // 2️⃣ 4로 나눠떨어지도록 조정 (0단위 유지)
    while (adjusted % 4 !== 0) {
      adjusted += 10;
    }

    return adjusted;
  }, [currentStayList]);

  // 1) 커스텀 툴팁 컴포넌트
  const HourTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    // Recharts payload에서 각 시리즈 찾기
    const getItem = (key) => payload.find((p) => p.dataKey === key);
    const inItem = getItem("in");
    const outItem = getItem("out");

    // 색상은 payload.color(또는 fill)에서 가져옴, 없으면 기본값
    const inColor = inItem?.color || inItem?.fill || "#8884d8"; // 보라
    const outColor = outItem?.color || outItem?.fill || "#82ca9d"; // 초록

    return (
      <div
        style={{
          background: "rgba(24, 24, 24, 0.9)", // 차트 배경 톤에 맞게
          color: "#fff",
          padding: "6px 8px",
          borderRadius: 6,
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,.25)",
          fontSize: 12,
        }}
      >
        {inItem && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                background: inColor,
                borderRadius: 2, // 네모칸
                display: "inline-block",
              }}
            />
            <span>입장 수 : {inItem.value}</span>
          </div>
        )}
        {outItem && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: outColor,
                borderRadius: 2, // 네모칸
                display: "inline-block",
              }}
            />
            <span>퇴장 수 : {outItem.value}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="right">
      {/* 본문 테이블 */}
      <div className="content">
        <div className="dashboard_wrapper">
          <div className="device_selectbox">
            {deviceList.length === 0 ? (
              <button
                className="device_name on no-device"
                disabled
                aria-disabled="true"
                title="등록된 장비가 없습니다"
              >
                <IonIcon name="IoStatsChart" size={30} />
                장비없음
              </button>
            ) : (
              deviceList.map((d) => {
                const active = selectedEqTableId === d.eqTableId;
                return (
                  <button
                    key={d.eqTableId}
                    className={`device_name ${active ? "on" : ""}`}
                    onClick={() => setSelectedEqTableId(d.eqTableId)}
                    title={d.locationName}
                  >
                    <IonIcon name="IoStatsChart" size={30} />
                    {d.locationName}
                  </button>
                );
              })
            )}
          </div>
          <div className="top_wrapper">
            <div className="top_column">
              <div className="top_row box">
                <div className="box_titlebox">오늘 총 입장</div>
                <div className="box_row">
                  <div className="numbox">
                    <div className="number">
                      {safeNum(board.TodayIn).toLocaleString()}
                    </div>
                    <div className="unit">명</div>
                  </div>
                  <div className="box_column">
                    <div className="innerbox averagepadding">
                      <div className="label">오전</div>
                      <div className="numbox_small">
                        <div className="number">
                          {safeNum(board.MorningIn).toLocaleString()}
                        </div>
                        <div className="unit">명</div>
                      </div>
                    </div>
                    <div className="innerbox averagepadding">
                      <div className="label">오후</div>
                      <div className="numbox_small">
                        <div className="number">
                          {safeNum(board.AfterNoonIn).toLocaleString()}
                        </div>
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
                      <div className="number">
                        {safeNum(board.AgoHourInCnt).toLocaleString()}
                      </div>
                      <div className="unit">명</div>
                    </div>
                  </div>
                  <div className="innerbox averagepadding">
                    <div className="label">퇴장</div>
                    <div className="numbox_small">
                      <div className="number">
                        {safeNum(board.AgoHourOutCnt).toLocaleString()}
                      </div>
                      <div className="unit">명</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="top_column box">
              <div className="box_titlebox">현재 체류 현황</div>
              <div className="summarys innerbox">
                <div className="summary ">
                  <div className="summary_label">최다인원 : </div>
                  <div className="summary_data">{board.MaxHourTime}</div>
                </div>

                <div className="summary">
                  <div className="summary_label">최저인원 : </div>
                  <div className="summary_data">{board.MinHourTime}</div>
                </div>
              </div>
              <div
                className="graph_type1"
                tabIndex={-1}
                onMouseDown={() => {
                  // 클릭 직후 포커스가 차트에 가지 않도록
                  if (document.activeElement) document.activeElement.blur();
                }}
              >
                <LineChart
                  width="100%"
                  height="100%"
                  data={currentStayList}
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis dataKey="name" domain={[0, maxYValue]} />
                  <Tooltip cursor={false} />
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
                data={hourInoutList}
                barCategoryGap="30%"
                barGap={5}
                onMouseMove={(state) => {
                  if (state?.isTooltipActive) {
                    setTtActive(true);
                    // 차트 내 좌표로 위치 제어 (원하면 생략 가능)
                    setTtPos({ x: state.chartX, y: state.chartY });
                  } else {
                    setTtActive(false);
                  }
                }}
                onMouseLeave={() => setTtActive(false)} // ← 마우스 떼면 바로 숨김
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                {/* <Tooltip
                  // hover 전용으로 강제
                  trigger="hover"
                  active={ttActive}
                  position={ttPos}
                  cursor={{ fill: "transparent" }}
                  labelFormatter={() => ""}
                  formatter={(value, name) => [
                    String(value),
                    name === "in" ? "입장 수" : "퇴장 수",
                  ]}
                  // 툴팁이 마우스를 가로채지 않도록 (중요)
                  wrapperStyle={{
                    backgroundColor: "#1f1f1f", // ← 네가 원하는 어두운 배경
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    pointerEvents: "none",
                  }}
                /> */}
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={<HourTooltip />}
                />
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
