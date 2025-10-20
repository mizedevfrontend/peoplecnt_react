import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";

const VisitList = () => {
  const { selectedWorkplaceId } = useWorkplace();

  /** 탭 */
  const [activeTab, setActiveTab] = useState("today"); // today | daily
  const [todaySubTab, setTodaySubTab] = useState("io"); // io | stay
  const VISIT_API = {
    TODAY_INOUT: "/api/VisitList/today-inout-list",
    TODAY_STAY: "/api/VisitList/today-stay-list",
    DAILY_CARDS: "/api/VisitList/daily-cards-info",
    DAILY_SUMMARY: "/api/VisitList/daily-summary-list",
    DEVICE_LIST: "/api/Device/workplace-device-list",
  };

  /** 공통 */
  const [pageSize, setPageSize] = useState(10);

  /** 장치 목록/선택 */
  const [deviceList, setDeviceList] = useState([]); // [{deviceId, deviceName}, ...]
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [devicePage, setDevicePage] = useState(1); // 필요하면 페이징
  const [selectedEqTableId, setSelectedEqTableId] = useState(null); // null = 전체

  /** 금일-입출 */
  const [todayInoutList, setTodayInoutList] = useState([]);
  const [todayInoutTotal, setTodayInoutTotal] = useState(0);
  const [todayInTotal, setTodayInTotal] = useState(0);
  const [todayOutTotal, setTodayOutTotal] = useState(0);
  const [todayInoutPage, setTodayInoutPage] = useState(1);

  /** 금일-체류 */
  const [todayStayList, setTodayStayList] = useState([]);
  const [todayStayTotal, setTodayStayTotal] = useState(0);
  const [todayStayPage, setTodayStayPage] = useState(1);

  /** 일자별 */
  const [rangePreset, setRangePreset] = useState("today");
  const [range, setRange] = useState({ start: "", end: "" });
  const [dailyCards, setDailyCards] = useState({ last7: 0, last30: 0, ytd: 0 });
  const [dailyList, setDailyList] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyPage, setDailyPage] = useState(1);

  /** 유틸 */
  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = useMemo(() => new Date(), []);

  const quickSet = (type) => {
    const end = new Date();
    const start = new Date();
    if (type === "7d") start.setDate(end.getDate() - 6);
    else if (type === "1m") start.setMonth(end.getMonth() - 1);
    // 'today'면 그대로 (start=end=오늘)
    setRange({ start: fmt(start), end: fmt(end) });
    setRangePreset(type);
  };

  const handlePageSizeChange = (n) => {
    setPageSize(n);
    if (activeTab === "today") {
      if (todaySubTab === "io") setTodayInoutPage(1);
      else setTodayStayPage(1);
    } else setDailyPage(1);
  };
  const getStatus = (err) => err?.response?.status ?? err?.status ?? null;
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // 장치 목록 불러오기
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
      const res = await apiClient.post(VISIT_API.DEVICE_LIST, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;

      const rows = (data?.data ?? []).map((d, idx) => ({
        eqTableId: d.eqTableId,
        locationName: d.locationName,
        //rtspUrl: item.rtspUrl,
      }));

      setDeviceList(rows);
      setDeviceTotal(data?.meta?.totalCount ?? rows.length);

      if (rows.length > 0) {
        const firstId = rows[0].eqTableId;
        setSelectedEqTableId((prev) => (prev ? prev : firstId));
      } else {
        setSelectedEqTableId(null);
        setTodayInTotal(0);
        setTodayOutTotal(0);
        setTodayInoutList([]);
        setTodayInoutTotal(0);
        setTodayStayList([]);
        setTodayStayTotal(0);
        setDailyCards({ last7: 0, last30: 0, ytd: 0 });
        setDailyList([]);
        setDailyTotal(0);
      }
    } catch (err) {
      const st = getStatus(err);
      console.error("[ERR] DEVICE_LIST", st, err);

      setDeviceList([]);
      setDeviceTotal(0);
      setSelectedEqTableId(null);
      setTodayInTotal(0);
      setTodayOutTotal(0);
      setTodayInoutList([]);
      setTodayInoutTotal(0);
      setTodayStayList([]);
      setTodayStayTotal(0);
      setDailyCards({ last7: 0, last30: 0, ytd: 0 });
      setDailyList([]);
      setDailyTotal(0);
    }
  }, [VISIT_API.DEVICE_LIST, devicePage, selectedWorkplaceId]);

  const fetchTodayInout = useCallback(async () => {
    if (!selectedEqTableId) {
      setTodayInoutList([]);
      setTodayInoutTotal(0);
      // 합계는 totals 함수가 처리
      return;
    }

    const url = VISIT_API.TODAY_INOUT;
    const body = {
      WorkplaceId: selectedWorkplaceId,
      Page: todayInoutPage,
      PageSize: pageSize,
      EqTableId: selectedEqTableId,
      LoginUserId: localStorage.getItem("userid"),
    };
    try {
      const res = await apiClient.post(url, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;

      setTodayInoutList(
        (data?.data || []).map((it) => ({
          no: it.no,
          timeRange: it.hourPeriod, // 00:00 ~ 00:59:59
          inCount: it.inCnt,
          outCount: it.outCnt,
        }))
      );
      setTodayInoutTotal(data?.meta?.totalCount ?? 0);
    } catch (err) {
      const st = getStatus(err);
      console.error("[ERR] TODAY_INOUT", st, err);
      setTodayInoutList([]);
      setTodayInoutTotal(0);
    }
  }, [
    VISIT_API.TODAY_INOUT,
    pageSize,
    selectedEqTableId,
    selectedWorkplaceId,
    todayInoutPage,
  ]);

  const fetchTodayInoutTotals = useCallback(async () => {
    if (!selectedEqTableId) {
      setTodayInTotal(0);
      setTodayOutTotal(0);
      return;
    }
    try {
      const url = VISIT_API.TODAY_INOUT;
      const body = {
        WorkplaceId: selectedWorkplaceId,
        Page: 1,
        PageSize: 500, // 하루 시간대 24개 기준 넉넉히
        EqTableId: selectedEqTableId,
        LoginUserId: localStorage.getItem("userid"),
      };
      const res = await apiClient.post(url, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;

      const rows = data?.data ?? [];
      const inSum = rows.reduce((s, r) => s + toNum(r.inCnt), 0);
      const outSum = rows.reduce((s, r) => s + toNum(r.outCnt), 0);
      setTodayInTotal(inSum);
      setTodayOutTotal(outSum);
    } catch (err) {
      console.error("[ERR] TODAY_INOUT TOTALS", getStatus(err), err);
      // 실패 시 0으로
      setTodayInTotal(0);
      setTodayOutTotal(0);
    }
  }, [VISIT_API.TODAY_INOUT, selectedEqTableId, selectedWorkplaceId]);

  const fetchTodayStay = useCallback(async () => {
    if (!selectedEqTableId) {
      setTodayStayList([]);
      setTodayStayTotal(0);
      return;
    }

    const url = VISIT_API.TODAY_STAY;
    const body = {
      WorkplaceId: selectedWorkplaceId,
      Page: todayStayPage,
      PageSize: pageSize,
      EqTableId: selectedEqTableId, // 🔸추가
      LoginUserId: localStorage.getItem("userid"),
    };
    try {
      const res = await apiClient.post(url, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      setTodayStayList(
        (data?.data || []).map((it) => ({
          no: it.no,
          hour: it.timeUnit,
          stayCount: it.stayCnt,
        }))
      );
      setTodayStayTotal(data?.meta?.totalCount ?? 0);
    } catch (err) {
      const st = getStatus(err);
      console.error("[ERR] TODAY_STAY", st, err);
      if (st === 404) {
        const mock = Array.from({ length: pageSize }, (_, i) => ({
          no: i + 1 + (todayStayPage - 1) * pageSize,
          hour: `${String(15 - i).padStart(2, "0")}:00:00`,
          stayCount: Math.floor(Math.random() * 120),
        }));
        setTodayStayList(mock);
        setTodayStayTotal(16);
      } else {
        alert("금일 체류 데이터를 조회할 수 없습니다.");
        setTodayStayList([]);
        setTodayStayTotal(0);
      }
    }
  }, [
    VISIT_API.TODAY_STAY,
    pageSize,
    selectedEqTableId,
    selectedWorkplaceId,
    todayStayPage,
  ]);

  const fetchDailyCards = useCallback(async () => {
    if (!selectedEqTableId) {
      setDailyCards({ last7: 0, last30: 0, ytd: 0 });
      return;
    }
    const url = VISIT_API.DAILY_CARDS;
    const body = {
      WorkplaceId: selectedWorkplaceId,
      StartDate: range.start,
      EndDate: range.end,
      EqTableId: selectedEqTableId,
      LoginUserId: localStorage.getItem("userid"),
    };
    try {
      const res = await apiClient.post(url, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;

      const row = data?.data?.[0] || {};
      setDailyCards({
        last7: row.last7,
        last30: row.last30,
        ytd: row.lastYear,
      });
    } catch (err) {
      const st = getStatus(err);
      console.error("[ERR] DAILY_CARDS", st, err);
      if (st === 404) setDailyCards({ last7: 0, last30: 0, ytd: 0 });
      else setDailyCards({ last7: 0, last30: 0, ytd: 0 });
    }
  }, [
    VISIT_API.DAILY_CARDS,
    range.end,
    range.start,
    selectedEqTableId,
    selectedWorkplaceId,
  ]);

  const fetchDailyList = useCallback(async () => {
    if (!selectedEqTableId) {
      setDailyList([]);
      setDailyTotal(0);
      return;
    }
    const url = VISIT_API.DAILY_SUMMARY;
    const body = {
      Page: dailyPage,
      PageSize: pageSize,
      OrderType: "date_desc",
      WorkplaceId: selectedWorkplaceId,
      StartDate: range.start,
      EndDate: range.end,
      EqTableId: selectedEqTableId, // 🔸추가
      LoginUserId: localStorage.getItem("userid"),
    };
    try {
      const res = await apiClient.post(url, body);
      const data =
        typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      setDailyList(
        (data?.data || []).map((it) => ({
          no: it.no,
          date: it.dateUnit,
          inCount: it.inCnt,
          outCount: it.outCnt,
        }))
      );
      setDailyTotal(data?.meta?.totalCount ?? 0);
    } catch (err) {
      const st = getStatus(err);
      console.error("[ERR] DAILY_SUMMARY", st, err);
      if (st === 404) {
        const base = new Date(range.end || new Date());
        const mock = Array.from({ length: pageSize }, (_, i) => {
          const d = new Date(base);
          d.setDate(d.getDate() - i);
          return {
            no: i + 1 + (dailyPage - 1) * pageSize,
            date: d.toISOString().slice(0, 10),
            inCount: Math.floor(Math.random() * 900),
            outCount: Math.floor(Math.random() * 900),
          };
        });
        setDailyList(mock);
        setDailyTotal(8);
      } else {
        alert("일자별 데이터를 조회할 수 없습니다.");
        setDailyList([]);
        setDailyTotal(0);
      }
    }
  }, [
    VISIT_API.DAILY_SUMMARY,
    dailyPage,
    pageSize,
    range.end,
    range.start,
    selectedEqTableId,
    selectedWorkplaceId,
  ]);

  // 일자별 탭에 들어올 때마다 오늘~오늘로 리셋
  useEffect(() => {
    if (activeTab === "daily") {
      quickSet("today");
    }
  }, [activeTab]);

  // 일자별 데이터 로드: range가 준비되면 호출
  useEffect(() => {
    if (activeTab === "daily" && range.start && range.end) {
      fetchDailyCards();
      fetchDailyList();
    }
  }, [
    activeTab,
    range.start,
    range.end,
    fetchDailyCards,
    fetchDailyList,
    selectedEqTableId,
  ]);

  // 장비가 바뀌거나 탭이 금일-입출일 때, 또는 초기 로드 시
  useEffect(() => {
    if (activeTab === "today" && todaySubTab === "io") {
      fetchTodayInout(); // 리스트(페이징)
      fetchTodayInoutTotals(); // 전체 합계
    }
  }, [
    activeTab,
    todaySubTab,
    fetchTodayInout,
    fetchTodayInoutTotals,
    selectedEqTableId,
    pageSize,
    todayInoutPage,
  ]);

  /** 로딩 트리거 */
  useEffect(() => {
    fetchDeviceList();
  }, [fetchDeviceList]); // 🔸장치 목록
  useEffect(() => {
    if (activeTab === "today" && todaySubTab === "io") fetchTodayInout();
  }, [activeTab, todaySubTab, fetchTodayInout, selectedEqTableId]); // 🔸장치 연동
  useEffect(() => {
    if (activeTab === "today" && todaySubTab === "stay") fetchTodayStay();
  }, [activeTab, todaySubTab, fetchTodayStay, selectedEqTableId]); // 🔸장치 연동
  useEffect(() => {
    if (activeTab === "daily") {
      if (range.start && range.end) {
        fetchDailyCards();
        fetchDailyList();
      }
    }
  }, [
    activeTab,
    fetchDailyCards,
    fetchDailyList,
    range.start,
    range.end,
    selectedEqTableId,
  ]); // 🔸장치 연동

  /** 엑셀 다운로드 (장치필터 추가) */
  const handleExcelDownload = async () => {
    try {
      let url = "";
      let payload = {};
      if (activeTab === "today" && todaySubTab === "io") {
        url = "/api/Excel/today-inout";
        payload = {
          WorkplaceId: selectedWorkplaceId,
          EqTableId: selectedEqTableId,
        };
      } else if (activeTab === "today" && todaySubTab === "stay") {
        url = "/api/Excel/today-stay";
        payload = {
          WorkplaceId: selectedWorkplaceId,
          EqTableId: selectedEqTableId,
        };
      } else {
        url = "/api/Excel/daily-summary";
        payload = {
          WorkplaceId: selectedWorkplaceId,
          StartDate: range.start,
          EndDate: range.end,
          EqTableId: selectedEqTableId,
        };
      }
      const res = await apiClient.post(url, payload, { responseType: "blob" });
      const dispo = res.headers?.["content-disposition"] || "";
      const match = dispo.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const filename = match
        ? decodeURIComponent(match[1].replace(/['"]/g, ""))
        : `visit_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const blobUrl = URL.createObjectURL(
        new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("엑셀 다운로드 실패:", err);
      alert("엑셀 파일을 다운받을 수 없습니다.");
    }
  };

  /** 페이지네이션 공통 */
  const Pagination = ({ page, total, onChange }) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) {
      return (
        <div className="pagination">
          <button className="num on" aria-current="page" disabled>
            1
          </button>
        </div>
      );
    }

    // 5개 단위 블록 계산
    const blockSize = 5;
    const currentBlock = Math.floor((page - 1) / blockSize);
    const start = currentBlock * blockSize + 1;
    const end = Math.min(start + blockSize - 1, totalPages);

    const goFirst = () => onChange(1);
    const goPrev = () => onChange(Math.max(1, page - 1));
    const goNext = () => onChange(Math.min(totalPages, page + 1));
    const goLast = () => onChange(totalPages);
    const goPrevBlock = () => onChange(Math.max(1, start - 1));
    const goNextBlock = () => onChange(Math.min(totalPages, end + 1));

    return (
      <div className="pagination">
        {/* <button onClick={goFirst} disabled={page <= 1}>
          &laquo;
        </button> */}
        <button onClick={goPrevBlock} disabled={start === 1}>
          &lsaquo;&lsaquo;
        </button>
        <button onClick={goPrev} disabled={page <= 1}>
          &lsaquo;
        </button>

        {Array.from({ length: end - start + 1 }, (_, i) => {
          const n = start + i;
          const isActive = page === n;
          return (
            <button
              key={n}
              className={`num ${isActive ? "on" : ""}`}
              onClick={() => onChange(n)}
              aria-current={isActive ? "page" : undefined}
            >
              {n}
            </button>
          );
        })}

        <button onClick={goNext} disabled={page >= totalPages}>
          &rsaquo;
        </button>
        <button onClick={goNextBlock} disabled={end === totalPages}>
          &rsaquo;&rsaquo;
        </button>
        {/* <button onClick={goLast} disabled={page >= totalPages}>
          &raquo;
        </button> */}
      </div>
    );
  };

  /** 공통 카드 */
  const StatCard = ({ label, value }) => (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value?.toLocaleString?.() ?? value}</div>
    </div>
  );

  const DeviceChips = () => (
    <div className="device-chips">
      {deviceList.length === 0 ? (
        // 👉 on 클래스로 활성 스타일 부여 + disabled로 클릭 방지
        <button
          className="chip on no-device"
          disabled
          aria-disabled="true"
          tabIndex={-1}
          title="등록된 장비가 없습니다"
        >
          장비없음
        </button>
      ) : (
        deviceList.map((d) => (
          <button
            key={d.eqTableId}
            className={`chip ${selectedEqTableId === d.eqTableId ? "on" : ""}`}
            onClick={() => {
              setSelectedEqTableId(d.eqTableId);
              setTodayInoutPage(1);
              setTodayStayPage(1);
              setDailyPage(1);
            }}
            title={d.locationName}
          >
            {d.locationName}
          </button>
        ))
      )}
    </div>
  );

  /** ------- 렌더 ------- */
  return (
    <div className="right visit-page">
      {/* 탭 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "today" ? "on" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          금일 <SvgIcons icon="chevron" />
        </button>
        <button
          className={`tab ${activeTab === "daily" ? "on" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          일자별 <SvgIcons icon="chevron" />
        </button>
      </div>

      <DeviceChips />

      {/* 금일 서브탭 */}
      {activeTab === "today" && (
        <>
          <p className="desc">
            오늘 방문객의 입퇴장 수 및 시간대 체류 인원을 조회합니다.
            <br />※ 수집 과정에서 일부 오차가 발생할 수 있습니다.
          </p>
          <div className="subtabs">
            <button
              className={`small_btn ${todaySubTab === "io" ? "on" : ""}`}
              onClick={() => {
                setTodaySubTab("io");
                setTodayInoutPage(1);
              }}
            >
              입출 정보
            </button>
            <button
              className={`small_btn ${todaySubTab === "stay" ? "on" : ""}`}
              onClick={() => {
                setTodaySubTab("stay");
                setTodayStayPage(1);
              }}
            >
              체류 정보
            </button>
          </div>
        </>
      )}

      {/* 금일 - 입출 정보 */}
      {activeTab === "today" && todaySubTab === "io" && (
        <div className="content">
          <div className="stat-row two">
            <StatCard label="총 입장" value={todayInTotal} />
            <StatCard label="총 퇴장" value={todayOutTotal} />
          </div>

          <div className="tablebox">
            <div className="info">
              총 <span>{todayInoutTotal}</span>건
              <div className="actions">
                <div className="page-size">
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                {/* <button className="small_btn on" onClick={handleExcelDownload}>
                  <SvgIcons icon="download" /> 엑셀 다운로드
                </button> */}
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>시간</th>
                    <th>입장</th>
                    <th>퇴장</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInoutList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    todayInoutList.map((r) => (
                      <tr key={r.no}>
                        <td>{r.no}</td>
                        <td>{r.timeRange}</td>
                        <td>{r.inCount}</td>
                        <td>{r.outCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {todayInoutList.length > 0 && (
              <Pagination
                page={todayInoutPage}
                total={todayInoutTotal}
                onChange={setTodayInoutPage}
              />
            )}
          </div>
        </div>
      )}

      {/* 금일 - 체류 정보 */}
      {activeTab === "today" && todaySubTab === "stay" && (
        <div className="content">
          <div className="tablebox">
            <div className="info">
              총 <span>{todayStayTotal}</span>건
              <div className="actions">
                <div className="page-size">
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                {/* <button className="small_btn on" onClick={handleExcelDownload}>
                  <SvgIcons icon="download" /> 엑셀 다운로드
                </button> */}
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>시간</th>
                    <th>체류 인원</th>
                  </tr>
                </thead>
                <tbody>
                  {todayStayList.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center" }}>
                        데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    todayStayList.map((r) => (
                      <tr key={r.no}>
                        <td>{r.no}</td>
                        <td>{r.hour}</td>
                        <td>{r.stayCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {todayStayList.length > 0 && (
              <Pagination
                page={todayStayPage}
                total={todayStayTotal}
                onChange={setTodayStayPage}
              />
            )}
          </div>
        </div>
      )}

      {/* 일자별 */}
      {activeTab === "daily" && (
        <div className="content">
          <p className="desc">
            당일 방문객의 입.퇴장 수를 일별로 조회합니다.
            <br />※ 수집 과정에서 일부 오차가 발생할 수 있습니다.
          </p>

          <div className="range-filter">
            <input
              type="date"
              value={range.start}
              onChange={(e) => {
                setRange((s) => ({ ...s, start: e.target.value }));
                setRangePreset("custom");
              }}
              max={range.end || fmt(today)}
            />
            …
            <input
              type="date"
              value={range.end}
              onChange={(e) => {
                setRange((s) => ({ ...s, end: e.target.value }));
                setRangePreset("custom");
              }}
              min={range.start || ""}
              max={fmt(today)}
            />
            <div className="quick">
              <button
                className={`small_btn ${rangePreset === "today" ? "on" : ""}`}
                onClick={() => quickSet("today")}
              >
                오늘
              </button>
              <button
                className={`small_btn ${rangePreset === "7d" ? "on" : ""}`}
                onClick={() => quickSet("7d")}
              >
                7일
              </button>
              <button
                className={`small_btn ${rangePreset === "1m" ? "on" : ""}`}
                onClick={() => quickSet("1m")}
              >
                1개월
              </button>
            </div>
          </div>

          <div className="stat-row three">
            <StatCard label="최근 7일" value={dailyCards.last7} /> /
            <StatCard label="최근 1개월" value={dailyCards.last30} /> /
            <StatCard label="올해 누적" value={dailyCards.ytd} /> /
          </div>

          <div className="tablebox">
            <div className="info">
              총 <span>{dailyTotal}</span>건
              <div className="actions">
                <div className="page-size">
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                {/* <button className="small_btn on" onClick={handleExcelDownload}>
                  <SvgIcons icon="download" /> 엑셀 다운로드
                </button> */}
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>일자</th>
                    <th>입장</th>
                    <th>퇴장</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    dailyList.map((r) => (
                      <tr key={r.no}>
                        <td>{r.no}</td>
                        <td>{r.date}</td>
                        <td>{r.inCount}</td>
                        <td>{r.outCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {dailyList.length > 0 && (
              <Pagination
                page={dailyPage}
                total={dailyTotal}
                onChange={setDailyPage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitList;
