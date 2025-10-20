import React, { useState, useEffect, useCallback } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import Modal from "react-modal";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";
import IonIcon from "../components/IonIcon";

const Management = () => {
  const { selectedWorkplaceId } = useWorkplace(); // Context 사용 // 다른페이지에서도 workplace 알아야 해서
  const [activeTab, setActiveTab] = useState("workplace"); // useState("device"); // 현재 활성 탭

  /* 사업장 관리용 */
  const [selectedWorkplaceStatus, setSelectedWorkplaceStatus] =
    useState("전체"); // 상태
  const [workplaceResults, setWorkplaceResults] = useState([]); // 사업장 데이터
  const [workplaceTotalCount, setWorkplaceTotalCount] = useState(0); // 사업장관리 총 건수
  const [workplaceKeyword, setWorkplaceKeyword] = useState(""); // 사업장명 키워드
  const [adminidKeyword, setAdminidKeyword] = useState(""); // 관리자ID 키워드
  const [selectedWorkplaceRows, setSelectedWorkplaceRows] = useState([]);

  /* 장치 관리용 */
  const [selectedDeviceStatus, setSelectedDeviceStatus] = useState("전체"); // 장치상태
  const [deviceResults, setDeviceResults] = useState([]); // 장치 데이터
  const [deviceTotalCount, setDeviceTotalCount] = useState(0); // 장치 총 건수
  const [devicenameKeyword, setDeviceNameKeyword] = useState(""); // 제품명 키워드
  const [devicesnKeyword, setDeviceSNKeyword] = useState(""); // 시리얼번호 키워드
  const [selectedDeviceRows, setSelectedDeviceRows] = useState([]);

  const [updatingMap, setUpdatingMap] = useState({});
  const keyW = (row) => `W-${row.workplaceid ?? row.workplaceId ?? row.no}`;
  const keyD = (row) => `D-${row.eqTableId ?? row.sn ?? row.no}`;

  const isActive = (v) => v === "Y" || v === "활성" || v === true || v === 1;
  const toLabel = (v) => (isActive(v) ? "활성" : "비활성");
  const toYN = (v) => (isActive(v) ? "Y" : "N");
  const [selectedDevice, setSelectedDevice] = useState(null); // 인증로그 선택한 row

  useEffect(() => {
    if (activeTab === "workplace") setSelectedDeviceRows([]);
    if (activeTab === "device") setSelectedWorkplaceRows([]);
  }, [activeTab]);

  const handleSearch = useCallback(async () => {
    try {
      const params = {
        WorkplaceId: selectedWorkplaceId,
        LoginUserId: localStorage.getItem("userid"),
        Page: 1,
        PageSize: 10,
      };

      // 장치 관리
      if (activeTab === "device") {
        params.deviceStatus =
          selectedDeviceStatus === "전체" ? "" : selectedDeviceStatus;
        params.workplaceName = workplaceKeyword; // 사업장명 텍스트박스 값
        params.deviceName = devicenameKeyword; // 장치명
        params.deviceSn = devicesnKeyword; // 장치SN번호

        console.log("----WorkplaceId----" + selectedWorkplaceId);
        console.log("----DeviceStatus----" + params.deviceStatus);
        console.log("----WorkplaceName----" + params.workplaceName);
        console.log("----DeviceName----" + params.deviceName);
        console.log("----DeviceSN----" + params.deviceSn);

        const response = await apiClient.post("/api/Device/all-device-list", {
          Page: 1,
          PageSize: 100,
          OrderType: "createddtm_desc",
          DeviceStatus: params.deviceStatus,
          WorkplaceName: params.workplaceName,
          DeviceName: params.deviceName,
          SN: params.deviceSn,
          LoginUserId: localStorage.getItem("userid"),
        });

        const responseData =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;

        console.log(response.data);

        if (response.data) {
          const deviceResults = responseData.data.map((item) => ({
            no: item.no,
            eqTableId: item.eqTableId,
            inhaEqId: item.inhaEqId,
            companyId: item.companyId,
            workplaceId: item.workplaceId,
            productName: item.productName,
            internalIpAddr: item.internalIpAddr,
            externalIpAddr: item.externalIpAddr,
            ptzYN: item.ptzYN,
            sn: item.sn,
            location: item.location,
            activateYN: item.activateYN,
            createddtm: item.createdDtm,
            delyn: item.delYN,
            deluserid: item.delUserId,
            deleteddtm: item.deletedDtm,
            workplaceName: item.workplaceName,
            locationName: item.locationName,
            rtspUrl: item.rtspUrl,
          }));
          setDeviceResults(deviceResults);
        } else {
          setDeviceResults([]);
        }

        setDeviceTotalCount(responseData.meta?.totalCount || 0);
      }
      // 사업장 관리
      else if (activeTab === "workplace") {
        params.workplaceStatus =
          selectedWorkplaceStatus === "전체" ? "" : selectedWorkplaceStatus;
        params.workplaceName = workplaceKeyword; // 소속 텍스트박스 값
        params.adminId = adminidKeyword; // 이름 텍스트박스 값

        console.log("----workplaceStatus----" + params.workplaceStatus);
        console.log("----WorkplaceName----" + params.workplaceName);
        console.log("----AdminId----" + params.adminId);

        const response = await apiClient.post(
          "/api/Workplace/all-super-workplace-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: "createddtm_desc",
            WorkplaceStatus: params.workplaceStatus,
            WorkplaceName: params.workplaceName,
            AdminId: params.adminId,
            LoginUserId: localStorage.getItem("userid"),
          }
        );

        const responseData =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;

        console.log(response.data);

        if (response.data) {
          const workplaceResults = responseData.data.map((item) => ({
            no: item.no,
            areaname: item.areaName,
            workplaceid: item.workplaceId,
            areaid: item.areaId,
            companyname: item.companyName,
            workplacename: item.workplaceName,
            activateyn: item.activateYN,
            delyn: item.delYN,
            deluserid: item.delUserId,
            deleteddtm: item.deletedDtm,
            createddtm: item.createdDtm,
            updateddtm: item.updatedDtm,
            addr: item.addr,
            latitude: item.latitude,
            longitude: item.longitude,
            adminid: item.adminId,
            equipareacnt: item.equipAreaCnt,
          }));
          setWorkplaceResults(workplaceResults);
        } else {
          setWorkplaceResults([]);
        }

        console.log(responseData.meta?.totalCount);
        setWorkplaceTotalCount(responseData.meta?.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch search results:", error);
    }
  }, [
    selectedWorkplaceId,
    activeTab,
    selectedDeviceStatus,
    selectedWorkplaceStatus,
    workplaceKeyword,
    adminidKeyword,
    devicenameKeyword,
    devicesnKeyword,
  ]);

  const toggleActivate = async (row) => {
    const canEdit =
      (localStorage.getItem("usertype") || "").toUpperCase() === "S";
    if (!canEdit) {
      alert("슈퍼 관리자만 변경할 수 있습니다.");
      return;
    }

    const rowId = row.workplaceid ?? row.workplaceId ?? row.no; // 안전하게 키 추출
    if (updatingMap[rowId]) return; // 중복 클릭 방지

    const prevActive = isActive(row.activateyn);
    const nextActive = !prevActive;

    // Optimistic UI 업데이트
    setUpdatingMap((m) => ({ ...m, [rowId]: true }));
    setWorkplaceResults((list) =>
      list.map((r) =>
        (r.workplaceid ?? r.workplaceId ?? r.no) === rowId
          ? { ...r, activateyn: nextActive ? "활성" : "비활성" }
          : r
      )
    );

    try {
      await apiClient.post("/api/Workplace/set-activate", {
        WorkplaceId: row.workplaceid,
        ActivateYN: nextActive ? "Y" : "N",
        LoginUserId: localStorage.getItem("userid"),
      });
    } catch (err) {
      console.error("상태 변경 실패:", err);
      alert("상태 변경에 실패했습니다. 다시 시도해주세요.");

      // 롤백
      setWorkplaceResults((list) =>
        list.map((r) =>
          (r.workplaceid ?? r.workplaceId ?? r.no) === rowId
            ? { ...r, activateyn: prevActive ? "활성" : "비활성" }
            : r
        )
      );
    } finally {
      setUpdatingMap((m) => {
        const copy = { ...m };
        delete copy[rowId];
        return copy;
      });
    }
  };

  useEffect(() => {
    handleSearch();
    const intervalId = setInterval(() => {
      handleSearch();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [handleSearch]);

  const handleKeyPress = (e, type) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  // 컴포넌트 안에 추가
  // const handleExcelDownload = async () => {
  //   try {
  //     // 템플릿 ID (DB의 excel_templates.id)
  //     const templateId = 1;

  //     // 서버에 넘길 바디 (필요한 파라미터만 채워서 사용)
  //     const payload =
  //       activeTab === "workplace"
  //         ? {
  //             startDate,
  //             endDate,
  //           }
  //         : {
  //             // daily 탭일 때는 하루짜리로 내려주고 싶으면 이렇게
  //             startDate: currentDate,
  //             endDate: currentDate,
  //           };

  //     // 파일 다운로드 (axios 래퍼 apiClient 가정)
  //     const res = await apiClient.post(`/api/Excel/excel-download`, payload, {
  //       responseType: "blob",
  //     });

  //     // 파일명 추출 (Content-Disposition 우선, 없으면 기본값)
  //     const dispo = res.headers?.["content-disposition"] || "";
  //     const match = dispo.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  //     const filename = match
  //       ? decodeURIComponent(match[1].replace(/['"]/g, ""))
  //       : `report_${new Date().toISOString().slice(0, 10)}.xlsx`;

  //     // 저장
  //     const blobUrl = URL.createObjectURL(
  //       new Blob([res.data], {
  //         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //       })
  //     );
  //     const a = document.createElement("a");
  //     a.href = blobUrl;
  //     a.download = filename;
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();
  //     URL.revokeObjectURL(blobUrl);
  //   } catch (err) {
  //     console.error("엑셀 다운로드 실패:", err);
  //     alert("엑셀 파일을 다운받을 수 없습니다.");
  //   }
  // };

  // 전체 선택 토글
  const handleSelectAll = (e) => {
    if (activeTab === "device") {
      setSelectedDeviceRows(
        e.target.checked ? deviceResults.map((r) => r.no) : []
      );
    } else {
      setSelectedWorkplaceRows(
        e.target.checked ? workplaceResults.map((r) => r.no) : []
      );
    }
  };

  // 개별 선택 토글
  const handleSelectRow = (id) => {
    if (activeTab === "device") {
      setSelectedDeviceRows((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
      );
    } else {
      setSelectedWorkplaceRows((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
      );
    }
  };
  const toggleDeviceActivate = async (row) => {
    const canEdit =
      (localStorage.getItem("usertype") || "").toUpperCase() === "S";
    if (!canEdit) {
      alert("슈퍼 관리자만 변경할 수 있습니다.");
      return;
    }

    const k = keyD(row);
    if (updatingMap[k]) return;

    const prevActive = isActive(row.activateYN);
    const nextActive = !prevActive;

    // optimistic
    setUpdatingMap((m) => ({ ...m, [k]: true }));
    setDeviceResults((list) =>
      list.map((r) =>
        keyD(r) === k ? { ...r, activateYN: nextActive ? "Y" : "N" } : r
      )
    );

    try {
      // ✅ 실제 API 엔드포인트/파라미터는 서버 규격에 맞게 조정
      await apiClient.post("/api/Device/set-activate", {
        EqTableId: row.eqTableId, // 또는 고유키(sn 등)
        ActivateYN: nextActive ? "Y" : "N",
        LoginUserId: localStorage.getItem("userid"),
      });
    } catch (err) {
      console.error("장치 사용여부 변경 실패:", err);
      alert("사용여부 변경에 실패했습니다. 다시 시도해주세요.");
      // 롤백
      setDeviceResults((list) =>
        list.map((r) =>
          keyD(r) === k ? { ...r, activateYN: prevActive ? "Y" : "N" } : r
        )
      );
    } finally {
      setUpdatingMap((m) => {
        const copy = { ...m };
        delete copy[k];
        return copy;
      });
    }
  };

  return (
    <div className="right">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "workplace" ? "on" : ""}`}
          onClick={() => setActiveTab("workplace")}
        >
          사업장 관리
          <SvgIcons icon="chevron" />
        </button>
        <button
          className={`tab ${activeTab === "device" ? "on" : ""}`}
          onClick={() => setActiveTab("device")}
        >
          장치 관리
          <SvgIcons icon="chevron" />
        </button>
        {/* <p>(적용시 없앨 예정) Selected Workplace ID : {selectedWorkplaceId}</p> */}
      </div>
      <div className="searchbox">
        {activeTab === "device" && (
          <>
            <div className="btns">
              <span>사용여부 :</span>
              {["전체", "사용", "미사용"].map((status) => (
                <button
                  key={status}
                  className={`small_btn ${
                    selectedDeviceStatus === status ? "on" : ""
                  }`}
                  onClick={() => setSelectedDeviceStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="keyword">
              <span>키워드 :</span>
              <input
                type="text"
                placeholder="사업장명을 입력하세요."
                value={workplaceKeyword}
                onChange={(e) => setWorkplaceKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <input
                type="text"
                placeholder="제품명을 입력하세요."
                value={devicenameKeyword}
                onChange={(e) => setDeviceNameKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <input
                type="text"
                placeholder="시리얼넘버(S/N)를 입력하세요."
                value={devicesnKeyword}
                onChange={(e) => setDeviceSNKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="small_btn on" onClick={handleSearch}>
                <SvgIcons icon="zoom" /> 검색
              </button>
            </div>
          </>
        )}
        {activeTab === "workplace" && (
          <>
            <div className="btns">
              <span>상태 :</span>
              {["전체", "활성", "비활성"].map((method) => (
                <button
                  key={method}
                  className={`small_btn ${
                    selectedWorkplaceStatus === method ? "on" : ""
                  }`}
                  onClick={() => setSelectedWorkplaceStatus(method)}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="keyword">
              <span>키워드 :</span>
              <input
                type="text"
                placeholder="사업장명을 입력하세요."
                value={workplaceKeyword}
                onChange={(e) => setWorkplaceKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <input
                type="text"
                placeholder="관리자 ID를 입력하세요."
                value={adminidKeyword}
                onChange={(e) => setAdminidKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="small_btn on" onClick={handleSearch}>
                <SvgIcons icon="zoom" /> 검색
              </button>
            </div>
          </>
        )}
      </div>
      <div className="content">
        <div className="tablebox">
          <div className="info">
            총
            <span>
              {activeTab === "device" ? deviceTotalCount : workplaceTotalCount}
            </span>
            <span>{activeTab === "device" ? "개" : "건"}</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {activeTab === "device" ? (
                    <>
                      <th>
                        {" "}
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            deviceResults.length > 0 &&
                            selectedDeviceRows.length === deviceResults.length
                          }
                        />
                      </th>
                      <th>번호</th>
                      <th>사업장</th>
                      <th>카메라위치</th>
                      <th>PTZ여부</th>
                      <th>제품명</th>
                      <th>S/N</th>
                      <th>생성일</th>
                      <th>사용여부</th>
                    </>
                  ) : (
                    <>
                      <th>
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            workplaceResults.length > 0 &&
                            selectedWorkplaceRows.length ===
                              workplaceResults.length
                          }
                        />
                      </th>
                      <th>번호</th>
                      <th>사업장명</th>
                      <th>구역</th>
                      <th>관리자ID</th>
                      <th>생성일</th>
                      <th>수정일</th>
                      <th>상태</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(activeTab === "device"
                  ? deviceResults
                  : workplaceResults
                ).map((result, index) => (
                  <tr key={index}>
                    {activeTab === "device" ? (
                      <>
                        <td>
                          {" "}
                          <input
                            type="checkbox"
                            checked={selectedDeviceRows.includes(result.no)}
                            onChange={() => handleSelectRow(result.no)}
                          />
                        </td>
                        <td>{result.no}</td>
                        <td>{result.workplaceName}</td>
                        <td>{result.locationName}</td>
                        <td>{result.ptzYN}</td>
                        <td>{result.productName}</td>
                        <td>{result.sn}</td>
                        <td>{result.createddtm}</td>
                        <td>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={isActive(result.activateYN)}
                              disabled={!!updatingMap[keyD(result)]}
                              onChange={() => toggleDeviceActivate(result)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {" "}
                          <input
                            type="checkbox"
                            checked={selectedWorkplaceRows.includes(result.no)}
                            onChange={() => handleSelectRow(result.no)}
                          />
                        </td>
                        <td>{result.no}</td>
                        <td>{result.workplacename}</td>
                        <td>{result.equipareacnt}</td>
                        <td>{result.adminid}</td>
                        <td>{result.createddtm}</td>
                        <td>{result.updateddtm}</td>
                        <td>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={isActive(result.activateyn)}
                              disabled={!!updatingMap[keyW(result)]}
                              onChange={() => toggleActivate(result)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Management;
