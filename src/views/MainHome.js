import React, { useEffect, useState, useCallback, useRef } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";
import IonIcon from "../components/IonIcon";

const MainHome = () => {
  const { selectedWorkplaceId } = useWorkplace();

  // 필터/검색
  const [keyword, setKeyword] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [mizeNoKey, setMizeNoKey] = useState(""); // 장비번호 검색 따로 진행
  const [orderType, setOrderType] = useState("mizeno_asc"); // 정렬 기본값
  const [assignment, setAssignment] = useState("");

  // 데이터/페이지네이션
  const [page, setPage] = useState(1);
  const [beaconRows, setBeaconRows] = useState([]); // 리스트에 바인딩할 데이터
  const [beaconTotal, setBeaconTotal] = useState(0); // 총 건수

  // 편집 상태
  const [editRow, setEditRow] = useState(null);
  const editRowRef = useRef(null);
  const [savingId, setSavingId] = useState(null);

  const [loading, setLoading] = useState(false);

  const resetToFirstPageAndSearch = () => {
    setPage(1);
    setSearchKey(keyword.trim());
  };

  // 편집 시작
  const startEdit = (row) => {
    setEditRow({
      bid: row.bid, // 이 행의 고유키
      employeeName: row.employeeName ?? "", // 현재 이름 -> 인풋 초기값
    });
  };

  const cancelEdit = () => setEditRow(null);

  const saveEmployeeName = async (bid) => {
    if (!editRow) return;
    setSavingId(bid);
    try {
      // 먼저 화면에 반영
      setBeaconRows((prev) =>
        prev.map((r) =>
          r.bid === bid ? { ...r, employeeName: editRow.employeeName } : r
        )
      );

      const { data } = await apiClient.post("/api/Beacon/save-employeename", {
        Bid: bid,
        EmployeeName: editRow.employeeName,
        WorkplaceId: selectedWorkplaceId,
      });

      const res = typeof data === "string" ? JSON.parse(data) : data;
      console.log(res.data[0].queryResult);

      if (res.data[0].queryResult === "success") {
        setEditRow(null);
      }
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const onEditKeyDown = (e, bid) => {
    if (e.key === "Enter") saveEmployeeName(bid);
    if (e.key === "Escape") cancelEdit();
  };

  useEffect(() => {
    if (!editRow) return;
    const onOutside = (e) => {
      // 편집 중인 행 영역 밖 클릭이면 취소
      if (editRowRef.current && !editRowRef.current.contains(e.target)) {
        cancelEdit();
      }
    };
    // 캡처 단계에서 잡아주면 더 안정적
    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [editRow]);

  useEffect(() => {
    if (!selectedWorkplaceId) return;

    const fetchAll = async () => {
      // 그룹별 출입현황 count API 호출
      try {
        const payload = {
          Page: 1,
          PageSize: 1000,
          OrderType: orderType,
          WorkplaceId: selectedWorkplaceId,
          SearchKey: searchKey,
          MizeNoKey: mizeNoKey.trim(),
          LoginUserId: localStorage.getItem("userid"),
        };
        // '미배정'일 때만 서버 필터를 켠다. (전체/배정일 땐 보내지 않음)
        if (assignment === "unassigned") {
          payload.EmployeeNoneYN = 1;
        } else if (assignment === "assigned") {
          payload.EmployeeNoneYN = 0;
        }

        const { data } = await apiClient.post(
          "/api/Beacon/all-beacons-list",
          payload
        );
        const res = typeof data === "string" ? JSON.parse(data) : data;
        console.log(res.data[0]);
        // batteryLevel, beaconMac, bid, callFlag, createdDtm
        // delYN, deletedDtm, deviceType, employeeId, employeeName
        // mizeNo, page, pageSize, preRecvMac, preRid
        // recvMac, rid, signalStrength, updatedDtm, workplaceId

        const rows = (res?.data ?? []).map((it) => ({
          bid: it.bid, // 고유키
          beaconMac: it.beaconMac, // 비콘 MAC
          signalStrength: it.signalStrength, // 수신 신호 강도
          batteryLevel: it.batteryLevel, // 배터리
          mizeNo: it.mizeNo, // 사내장비번호 등
          employeeId: it.employeeId ?? "", // 배정 사용자 ID
          employeeName: it.employeeName ?? "",
          recvMac: it.recvMac ?? "",
          prevRecvMac: it.preRecvMac ?? "",
          deviceType: it.deviceType ?? "",
          callFlag: it.callFlag, // 호출중 여부 등
          updatedAt: it.updatedDtm, // 최종 업데이트 시각
          workplaceId: it.workplaceId,
        }));

        // ── 서버가 MizeNoKey/ SearchKey를 아직 지원하지 않는 경우를 대비해
        //     프론트에서 한 번 더 보정 필터를 적용합니다.
        const k = searchKey.trim().toLowerCase();
        const m = mizeNoKey.trim().toLowerCase();

        //const filtered = rows.filter((r) => {
        const filteredByKeyword = rows.filter((r) => {
          // 장비번호 필터(전용 인풋): 비었으면 통과
          const passMize =
            m === ""
              ? true
              : String(r.mizeNo ?? "")
                  .toLowerCase()
                  .includes(m);
          // 키워드 필터(MAC/배정 사용자명 전용): 비었으면 통과
          const passKeyword =
            k === ""
              ? true
              : (r.beaconMac ?? "").toLowerCase().includes(k) ||
                (r.employeeName ?? "").toLowerCase().includes(k);
          return passMize && passKeyword;
        });

        // 배정 상태 필터: '', 'assigned', 'unassigned'
        const filtered = filteredByKeyword.filter((r) => {
          if (assignment === "unassigned") {
            // employeeId/employeeName 모두 비어 있으면 미배정으로 간주
            return !(r.employeeId ?? "") && !(r.employeeName ?? "");
          }
          if (assignment === "assigned") {
            return !!((r.employeeId ?? "") || (r.employeeName ?? ""));
          }
          return true; // 전체
        });

        // setBeaconRows(rows);
        // setBeaconTotal(res?.meta?.totalCount ?? rows.length);

        setBeaconRows(filtered);
        // total은 서버 total이 있으면 그걸 쓰고, 없으면 필터된 개수로
        const serverTotal = res?.meta?.totalCount;
        setBeaconTotal(
          typeof serverTotal === "number" ? serverTotal : filtered.length
        );
      } catch (e) {
        console.error("beacons get list error", e);
        setBeaconRows([]);
        setBeaconTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [selectedWorkplaceId, orderType, searchKey, page, assignment, mizeNoKey]);

  return (
    <div className="right">
      {/* 상단 탭(한 개) - 스크린샷 무드 맞춤 */}
      <div className="tabs">
        <button className="tab on">
          비콘관리
          <SvgIcons icon="chevron" />
        </button>
      </div>

      {/* 검색/필터 박스 */}
      <div className="searchbox">
        <div className="dropdown">
          <span>정렬 :</span>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
          >
            <option value="mizeno_asc">장비번호 ↑</option>
            <option value="mizeno_desc">장비번호 ↓</option>
            <option value="employeename_asc">사용자명 ↑</option>
            <option value="employeename_desc">사용자명 ↓</option>
          </select>
        </div>

        <div className="keyword">
          <span>장비번호:</span>
          <input
            type="text"
            placeholder="장비번호"
            value={mizeNoKey}
            onChange={(e) => {
              setMizeNoKey(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && resetToFirstPageAndSearch()}
            style={{ marginRight: 8 }}
          />
          <span>키워드:</span>
          <input
            type="text"
            placeholder="MAC/배정 사용자명"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setSearchKey(e.target.value.trim());
            }}
            onKeyDown={(e) => e.key === "Enter" && resetToFirstPageAndSearch()}
          />
          <button className="small_btn on" onClick={resetToFirstPageAndSearch}>
            <SvgIcons icon="zoom" /> 검색
          </button>
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={assignment === "unassigned"}
              onChange={() => {
                setAssignment((prev) =>
                  prev === "unassigned" ? "" : "unassigned"
                );
                setPage(1);
              }}
            />
            미배정 장비
          </label>
          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={assignment === "assigned"}
              onChange={() => {
                setAssignment((prev) =>
                  prev === "assigned" ? "" : "assigned"
                );
                setPage(1);
              }}
            />
            배정 장비
          </label>
        </div>
      </div>

      {/* 본문 테이블 */}
      <div className="content">
        <div className="tablebox">
          <div className="info">
            총 <span>{beaconTotal}</span> <span> 건</span>
          </div>

          <div className="table-container">
            <table>
              <colgroup>
                <col style={{ width: "7%" }} />
                <col />
                <col style={{ width: "7%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>장비번호</th>
                  <th>MAC</th>
                  <th>신호세기</th>
                  <th>배터리</th>
                  <th>배정 사용자</th>
                  <th>최근 업데이트</th>
                  <th>관리</th>
                </tr>
              </thead>

              {/* <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      불러오는 중…
                    </td>
                  </tr>
                ) : beaconRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  beaconRows.map((r) => (
                    <tr key={r.mizeNo}>
                      <td>{r.mizeNo}</td>
                      <td>{r.beaconMac}</td>
                      <td>{r.signalStrength}</td>
                      <td>
                        {r.batteryLevel == null || r.batteryLevel === ""
                          ? ""
                          : `${r.batteryLevel} %`}
                      </td>
                      <td>{r.employeeName || "-"}</td>
                      <td>{r.updatedAt || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody> */}
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      불러오는 중…
                    </td>
                  </tr>
                ) : beaconRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  beaconRows.map((r) => {
                    const editing = editRow?.bid === r.bid;
                    return (
                      <tr
                        key={r.bid ?? r.mizeNo}
                        ref={editing ? editRowRef : null}
                      >
                        <td>{r.mizeNo}</td>
                        <td>{r.beaconMac}</td>
                        <td>{r.signalStrength}</td>
                        <td>
                          {r.batteryLevel == null || r.batteryLevel === ""
                            ? ""
                            : `${r.batteryLevel} %`}
                        </td>

                        <td>
                          {editing ? (
                            <input
                              className="edit-name-input"
                              autoFocus
                              value={editRow.employeeName}
                              onChange={(e) =>
                                setEditRow((x) => ({
                                  ...x,
                                  employeeName: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => onEditKeyDown(e, r.bid)}
                              placeholder="이름을 입력하세요"
                            />
                          ) : (
                            <span
                              className={r.employeeName ? "" : "color_gray"}
                            >
                              {r.employeeName || "미지정"}
                            </span>
                          )}
                        </td>

                        <td>{r.updatedAt || "-"}</td>

                        <td>
                          {" "}
                          {!editing ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {" "}
                              <button
                                className="small_btn"
                                onClick={() => startEdit(r)}
                                title="편집"
                              >
                                <IonIcon name="IoCreateOutline" size={18} />{" "}
                                편집
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: 5,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                className="small_btn on"
                                disabled={savingId === r.bid}
                                onClick={() => saveEmployeeName(r.bid)}
                                title="저장"
                              >
                                <IonIcon
                                  name="IoCheckmarkCircleOutline"
                                  size={18}
                                />
                                {savingId === r.bid ? "저장중…" : "저장"}
                              </button>
                              <button
                                className="small_btn"
                                onClick={cancelEdit}
                                title="취소"
                              >
                                <IonIcon
                                  name="IoCloseCircleOutline"
                                  size={18}
                                />{" "}
                                취소
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHome;
