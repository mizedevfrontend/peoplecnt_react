import React, { useState, useEffect, useCallback } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import Modal from "react-modal";
import SvgIcons from "../layouts/SvgIcons";
import apiClient from "../apiClient";
import IonIcon from "../components/IonIcon";

const Management = () => {
  const { selectedWorkplaceId } = useWorkplace(); // Context 사용 // 다른페이지에서도 workplace 알아야 해서
  const [activeTab, setActiveTab] = useState("workplace"); // useState("device"); // 현재 활성 탭
  const [currentDate, setCurrentDate] = useState(""); // 금일 날짜
  const [startDate, setStartDate] = useState(""); // 인증로그 시작 날짜
  const [endDate, setEndDate] = useState(""); // 인증로그 종료 날짜
  const [jobCategories, setJobCategories] = useState(["전체보기"]); // 업무구분 목록
  const [selectedCategory, setSelectedCategory] = useState("전체보기"); // 선택된 업무구분
  const [selectedEntryStatus, setSelectedEntryStatus] = useState("전체"); // 입실여부
  const [selectedAuthMethod, setSelectedAuthMethod] = useState("전체"); // 인증수단
  const [selectedAuthResult, setSelectedAuthResult] = useState("전체"); // 인증결과
  const [departmentKeyword, setDepartmentKeyword] = useState(""); // 소속 키워드
  const [nameKeyword, setNameKeyword] = useState(""); // 이름 키워드
  const [dailyResults, setDailyResults] = useState([]); // 일간출입자 데이터
  const [authResults, setAuthResults] = useState([]); // 인증로그 데이터
  const [dailyTotalCount, setDailyTotalCount] = useState(0); // 일간출입자 총 인원
  const [authTotalCount, setAuthTotalCount] = useState(0); // 인증로그 총 인원
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null); // 인증로그 선택한 row

  useEffect(() => {
    //const today = new Date().toISOString().split("T")[0];
    const today = new Date().toLocaleDateString("en-CA");
    setCurrentDate(today);
    setStartDate(today);
    setEndDate(today);

    // 업무구분 API 호출
    const fetchJobCategories = async () => {
      try {
        const response = await apiClient.post(
          "/api/EntryExit/all-employee-group-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: 1,
            WorkplaceId: selectedWorkplaceId,
            LoginUserId: localStorage.getItem("userid"),
          }
        );

        const responseData =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;

        if (!responseData || !responseData.data) {
          setJobCategories([{ groupID: "", groupName: "전체보기" }]);
          return;
        }

        console.log(response.data);

        const categories = responseData.data.map((item) => ({
          groupID: item.groupID,
          groupName: item.groupName,
        }));

        setJobCategories([
          { groupID: "", groupName: "전체보기" },
          ...categories,
        ]);
      } catch (error) {
        console.error("Failed to fetch job categories:", error);
      }
    };

    fetchJobCategories();
  }, [selectedWorkplaceId]);

  const openPopup = (entry) => {
    setSelectedEntry(entry);
    setIsPopupOpen(true);
  };

  const downloadImage = async () => {
    if (
      !selectedEntry ||
      !selectedEntry.imgFolderName ||
      !selectedEntry.imgFileName
    ) {
      alert("다운로드할 이미지가 없습니다.");
      return;
    }

    // 이미지 URL // 최종 적용 시 체크 해야 함
    const imageUrl = `${selectedEntry.workplacePublicIP}/ImageLog/${selectedEntry.imgFolderName}/${selectedEntry.imgFileName}`;

    try {
      const response = await fetch(imageUrl, {
        mode: "cors", // 서버에서 CORS 허용해야 함
      });
      if (!response.ok) {
        throw new Error("이미지를 불러오지 못했습니다.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = selectedEntry.imgFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl); // 메모리 해제
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      alert("이미지를 다운로드할 수 없습니다.");
    }
  };

  const handleSearch = useCallback(async () => {
    try {
      const params = {
        WorkplaceId: selectedWorkplaceId,
        LoginUserId: localStorage.getItem("userid"),
        Page: 1,
        PageSize: 10,
      };

      // 일간 출입자 검색
      if (activeTab === "device") {
        params.date = currentDate;
        params.category =
          (selectedCategory === "전체보기" ? "" : selectedCategory) || ""; // groupID 값을 넘김
        params.entryStatus =
          selectedEntryStatus === "전체" ? "" : selectedEntryStatus;
        params.CompanyTxt = departmentKeyword; // 소속 텍스트박스 값
        params.EmployeeName = nameKeyword; // 이름 텍스트박스 값

        console.log("----WorkplaceId----" + selectedWorkplaceId);
        console.log("----StartDate----" + params.date);
        console.log("----GroupId----" + params.category);
        console.log("----EntryExitType----" + params.entryStatus);
        console.log("----CompanyTxt----" + params.CompanyTxt);
        console.log("----EmployeeName----" + params.EmployeeName);

        const response = await apiClient.post(
          "/api/EntryExit/all-entryexit-data-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: "username_asc",
            WorkplaceId: selectedWorkplaceId,
            StartDate: params.date,
            GroupId: params.category,
            EntryExitType: params.entryStatus,
            CompanyTxt: params.CompanyTxt,
            EmployeeName: params.EmployeeName,
            LoginUserId: localStorage.getItem("userid"),
          }
        );

        const responseData =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;

        console.log(response.data);

        if (response.data) {
          const processedResults = responseData.data.map((item) => ({
            category: item.groupName,
            department: item.companyName,
            rank: item.userTitle,
            name: item.userName,
            id: item.userId,
            date: item.eventTime,
            entryTime: item.startTime,
            exitTime: item.endTime === "" ? "-" : item.endTime,
            stayTime: item.diffTime === "" ? "-" : item.diffTime,
            phone: item.phone,
            status: item.inoutYN === "I" ? "입실중" : "퇴실",
          }));
          setDailyResults(processedResults);
        } else {
          setDailyResults([]);
        }

        setDailyTotalCount(responseData.meta?.totalCount || 0);
      }
      // 인증로그 검색
      else if (activeTab === "workplace") {
        params.startDate = startDate;
        params.endDate = endDate;
        params.category =
          (selectedCategory === "전체보기" ? "" : selectedCategory) || ""; // groupID 값을 넘김
        params.authMethod =
          selectedAuthMethod === "전체" ? "" : selectedAuthMethod;
        params.authResult =
          selectedAuthResult === "전체" ? "" : selectedAuthResult;
        params.CompanyTxt = departmentKeyword; // 소속 텍스트박스 값
        params.EmployeeName = nameKeyword; // 이름 텍스트박스 값

        console.log("----WorkplaceId----" + selectedWorkplaceId);
        console.log("----StartDate----" + params.startDate);
        console.log("----EndDate----" + params.endDate);
        console.log("----GroupId----" + params.category);
        console.log("----AuthType----" + params.authMethod);
        console.log("----AuthResult----" + params.authResult);
        console.log("----CompanyTxt----" + params.CompanyTxt);
        console.log("----EmployeeName----" + params.EmployeeName);

        const response = await apiClient.post(
          "/api/EntryExit/all-log-data-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: "eventtime_desc",
            WorkplaceId: selectedWorkplaceId,
            StartDate: params.startDate,
            EndDate: params.endDate,
            GroupId: params.category,
            AuthType: params.authMethod,
            AuthResult: params.authResult,
            CompanyTxt: params.CompanyTxt,
            EmployeeName: params.EmployeeName,
            LoginUserId: localStorage.getItem("userid"),
          }
        );

        const responseData =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;

        console.log(response.data);

        if (response.data) {
          const processedResults = responseData.data.map((item) => ({
            date: item.eventTime,
            category: item.groupName,
            department: item.companyName,
            rank: item.userTitle,
            name: item.userName,
            phone: item.phone,
            device: item.deviceName,
            method: item.authType,
            result: item.eventDesc,
            imgFolderName: item.imgFolderName,
            imgFileName: item.imgFileName,
            workplacePublicIP: item.workplacePublicIP,
          }));
          setAuthResults(processedResults);
        } else {
          setAuthResults([]);
        }

        console.log(responseData.meta?.totalCount);
        setAuthTotalCount(responseData.meta?.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch search results:", error);
    }
  }, [
    selectedWorkplaceId,
    activeTab,
    currentDate,
    startDate,
    endDate,
    selectedCategory,
    selectedEntryStatus,
    selectedAuthMethod,
    selectedAuthResult,
    departmentKeyword,
    nameKeyword,
  ]);

  const closePopup = () => {
    setIsPopupOpen(false);
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
  const handleExcelDownload = async () => {
    try {
      // 템플릿 ID (DB의 excel_templates.id)
      const templateId = 1;

      // 서버에 넘길 바디 (필요한 파라미터만 채워서 사용)
      const payload =
        activeTab === "workplace"
          ? {
              startDate,
              endDate,
            }
          : {
              // daily 탭일 때는 하루짜리로 내려주고 싶으면 이렇게
              startDate: currentDate,
              endDate: currentDate,
            };

      // 파일 다운로드 (axios 래퍼 apiClient 가정)
      const res = await apiClient.post(`/api/Excel/excel-download`, payload, {
        responseType: "blob",
      });

      // 파일명 추출 (Content-Disposition 우선, 없으면 기본값)
      const dispo = res.headers?.["content-disposition"] || "";
      const match = dispo.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
      const filename = match
        ? decodeURIComponent(match[1].replace(/['"]/g, ""))
        : `report_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // 저장
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
            <div className="date">
              <span>일자:</span>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>
            <div className="dropdown">
              <span>업무구분:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {jobCategories.map((category) => (
                  <option key={category.groupID} value={category.groupID}>
                    {category.groupName}
                  </option>
                ))}
              </select>
            </div>

            <div className="btns">
              <span>입실여부:</span>
              {["전체", "입실중", "퇴실"].map((status) => (
                <button
                  key={status}
                  className={`small_btn ${
                    selectedEntryStatus === status ? "on" : ""
                  }`}
                  onClick={() => setSelectedEntryStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </>
        )}
        {activeTab === "workplace" && (
          <>
            <div className="date">
              <span>기간:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span>~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="dropdown">
              <span>업무구분:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {jobCategories.map((category) => (
                  <option key={category.groupID} value={category.groupID}>
                    {category.groupName}
                  </option>
                ))}
              </select>
            </div>

            <div className="btns">
              <span>인증수단:</span>
              {["전체", "얼굴", "기타"].map((method) => (
                <button
                  key={method}
                  className={`small_btn ${
                    selectedAuthMethod === method ? "on" : ""
                  }`}
                  onClick={() => setSelectedAuthMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="btns">
              <span>인증결과:</span>
              {["전체", "인증성공", "인증실패"].map((result) => (
                <button
                  key={result}
                  className={`small_btn ${
                    selectedAuthResult === result ? "on" : ""
                  }`}
                  onClick={() => setSelectedAuthResult(result)}
                >
                  {result}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="keyword">
          <span>키워드:</span>
          <input
            type="text"
            placeholder="소속을 입력하세요."
            value={departmentKeyword}
            onChange={(e) => setDepartmentKeyword(e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, "department")}
          />
          <input
            type="text"
            placeholder="이름을 입력하세요."
            value={nameKeyword}
            onChange={(e) => setNameKeyword(e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, "name")}
          />
          <button className="small_btn on" onClick={handleSearch}>
            <SvgIcons icon="zoom" /> 검색
          </button>
        </div>
      </div>
      <div className="content">
        <div className="tablebox">
          {/* 포스코인재창조원 엑셀다운 테스트 */}
          {/* <button
            className="small_btn"
            style={{ marginLeft: 8 }}
            onClick={handleExcelDownload}
          >
            <IonIcon name="IoDownloadOutline" size={18} /> 엑셀다운로드
          </button> */}
          <div className="info">
            총
            <span>
              {activeTab === "device" ? dailyTotalCount : authTotalCount}
            </span>
            <span>{activeTab === "device" ? "명" : "건"}</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {activeTab === "device" ? (
                    <>
                      <th>업무구분</th>
                      <th>소속</th>
                      <th>직급</th>
                      <th>이름</th>
                      <th>ID</th>
                      <th>휴대폰번호</th>
                      <th>입장</th>
                      <th>퇴장</th>
                      <th>체류시간</th>
                      <th>입실여부</th>
                    </>
                  ) : (
                    <>
                      <th>일시</th>
                      <th>업무구분</th>
                      <th>소속</th>
                      <th>직급</th>
                      <th>이름</th>
                      <th>휴대폰번호</th>
                      <th>인증장치</th>
                      <th>인증수단</th>
                      <th>인증결과</th>
                      <th>인증사진</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* <tr>
                <td>2024-06-28 13:52:52</td>
                <td>감리</td>
                <td>삼일엔지니어링</td>
                <td>상무</td>
                <td>박현진</td>
                <td>010-1547-6632</td>
                <td>입실_얼굴인식기#2</td>
                <td>얼굴</td>
                <td>인증성공</td>
                <td onClick={() => setIsPopupOpen(true)}>
                  <div className="align_center color_green">
                    <IonIcon name="IoImage" size={22} color="#15E041" />
                    사진보기
                  </div>
                </td>
              </tr> */}
                {(activeTab === "device" ? dailyResults : authResults).map(
                  (result, index) => (
                    <tr key={index}>
                      {activeTab === "device" ? (
                        <>
                          <td>{result.category}</td>
                          <td>{result.department}</td>
                          <td>{result.rank}</td>
                          <td>{result.name}</td>
                          <td>{result.id}</td>
                          <td>{result.phone}</td>
                          <td>{result.entryTime}</td>
                          <td>{result.exitTime}</td>
                          <td>{result.stayTime}</td>
                          <td>{result.status}</td>
                        </>
                      ) : (
                        <>
                          <td>{result.date}</td>
                          <td>{result.category}</td>
                          <td>{result.department}</td>
                          <td>{result.rank}</td>
                          <td>{result.name}</td>
                          <td>{result.phone}</td>
                          <td>{result.device}</td>
                          <td>{result.method}</td>
                          <td>{result.result}</td>
                          <td>
                            {result.imgFileName ? (
                              <div
                                className="align_center color_green"
                                onClick={() => openPopup(result)}
                                style={{ cursor: "pointer" }}
                              >
                                <IonIcon
                                  name="IoImage"
                                  size={22}
                                  color="#15E041"
                                />
                                사진보기
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {isPopupOpen && selectedEntry && (
        <Modal
          isOpen={isPopupOpen}
          onRequestClose={closePopup}
          contentLabel="인증사진보기"
          ariaHideApp={false}
          className="pop_dimm_inner"
          overlayClassName="pop_dimm"
        >
          <div className="popup">
            <div className="popheader">
              <div className="titlebox">
                <div className="poptitle">
                  <IonIcon name="IoImage" size={24} />
                  {selectedEntry.device} ({selectedEntry.name})
                </div>
                <button onClick={closePopup}>
                  <IonIcon name="IoClose" size={40} />
                </button>
              </div>
            </div>
            <div className="popbody">
              <div className="pop_photobox">
                <img
                  src={`${selectedEntry.workplacePublicIP}/ImageLog/${selectedEntry.imgFolderName}/${selectedEntry.imgFileName}`}
                  alt="인증사진"
                />
              </div>
            </div>
            <div className="popfooter">
              <div className="bottombtns pop">
                <button className="on" onClick={downloadImage}>
                  <IonIcon name="IoCloudDownloadOutline" />
                  사진저장
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Management;
