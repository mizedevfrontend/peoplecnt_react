import React, { useState, useRef, useEffect } from "react";
import IonIcon from "../components/IonIcon";
//import cctvSample from "../images/cctv_sample01.jpg";
import t300 from "../images/gm-t300.png";
import logo from "../images/logo.png";
import "../styles/dashboard.css";
import CustomIcon from "../components/CustomIcon";
import apiClient from "../apiClient";
import { useNavigate } from "react-router-dom";

const CHUNK_SIZE = 3; // 한 column에 3줄

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

const DashBoard = () => {
  useEffect(() => {
    if (!sessionStorage.getItem("hasReloaded")) {
      sessionStorage.setItem("hasReloaded", "true");
      window.location.reload();
    }
  }, []);

  const selectedWorkplaceId = localStorage.getItem("selectedWorkplaceId"); //useWorkplace(); // Context 사용

  const [now, setNow] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [stayCnt, setStayCnt] = useState([]);
  const [authResults, setAuthResults] = useState([]); // 인증로그 데이터
  const [cameraList, setCameraLists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pollRef = useRef(null);

  useEffect(() => {
    if (!selectedWorkplaceId) return;

    fetchCameras();
    const camTimer = setInterval(fetchCameras, 10000);
    return () => clearInterval(camTimer);
  }, [selectedWorkplaceId]);

  useEffect(() => {
    if (!selectedWorkplaceId) return;

    const fetchAll = async () => {
      // 그룹별 출입현황 count API 호출
      try {
        const { data } = await apiClient.post(
          "/api/DashBoard/all-entryexit-group-count-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: 1,
            WorkplaceId: selectedWorkplaceId,
            LoginUserId: localStorage.getItem("userid"),
            YearMonthDay: now.toISOString().slice(0, 10),
          }
        );

        const res = typeof data === "string" ? JSON.parse(data) : data;
        setGroups(
          Array.isArray(res.data)
            ? res.data.map((g) => ({
                name: g.groupName,
                count: g.groupCnt ?? g.groupCount ?? 0,
              }))
            : []
        );
      } catch (e) {
        console.error("Dashboard group count error", e);
      }

      // 잔류 출입현황 count API 호출
      try {
        const { data } = await apiClient.post(
          "/api/DashBoard/all-entryexit-remain-count-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: 1,
            WorkplaceId: selectedWorkplaceId,
            LoginUserId: localStorage.getItem("userid"),
            YearMonthDay: now.toISOString().slice(0, 10),
          }
        );

        const stayRes = typeof data === "string" ? JSON.parse(data) : data;

        setStayCnt(
          Array.isArray(stayRes.data)
            ? stayRes.data.map((g) => ({
                recount: g.remainCount,
              }))
            : []
        );
      } catch (e) {
        console.error("Dashboard remain count error", e);
      }

      // 출입내역 로그
      try {
        const response = await apiClient.post(
          "/api/EntryExit/all-log-data-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: "eventtime_desc",
            WorkplaceId: selectedWorkplaceId,
            StartDate: now.toISOString().slice(0, 10),
            EndDate: now.toISOString().slice(0, 10),
            GroupId: "",
            AuthType: "",
            AuthResult: "",
            CompanyTxt: "",
            EmployeeName: "",
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
          }));
          setAuthResults(processedResults);
        } else {
          setAuthResults([]);
        }
      } catch (e) {
        console.error("Dashboard EntryExit log error", e);
      }
    };

    fetchAll();
    pollRef.current = setInterval(fetchAll, 1000);

    return () => {
      clearInterval(pollRef.current);
    };
  }, [selectedWorkplaceId, now]);

  const handleClose = () => {
    navigate(-1); // 브라우저 히스토리 기준으로 이전 페이지로 이동
  };

  const fDate = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fTime = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const columns = chunkArray(groups, CHUNK_SIZE);
  const totalVisit = groups.reduce((acc, g) => acc + Number(g.count), 0);
  const totalStay = stayCnt.reduce((acc, g) => acc + Number(g.recount), 0);

  const ROW_LIMIT = 5;
  const rows = [
    ...authResults.slice(0, ROW_LIMIT),
    ...Array(Math.max(0, ROW_LIMIT - authResults.length)).fill(null),
  ];

  const fetchCameras = async () => {
    // 실시간 카메라리스트 뿌리기
    try {
      const response = await apiClient.post(
        "/api/RealTimeVideo/all-camera-list",
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
        console.warn("❌ No camera data found.");
        setCameraLists([]);
        return;
      }

      console.log("📷 카메라 리스트 업데이트", response.data);

      const categories = responseData.data.map((item) => ({
        cameraID: item.camId,
        cameraName: item.camPosition,
        camUrl: item.camURL,
        serverIP: item.serverIP,
        camUUID: item.camUUID,
      }));

      setCameraLists(categories);

      setTimeout(() => {
        categories.forEach((camera, index) => {
          console.log(`📡 WebSocket 재연결 시도: index ${index}`);
          startPlay(index, camera.serverIP, camera.camUUID);
        });
      }, 500); // 초기화 지연 방지
    } catch (error) {
      console.error("🚨 Failed to fetch camera lists:", error);
    }
  };

  const RECONNECT_INTERVAL = 300000; // 5분마다 자동 재연결
  const MAX_SESSION_DURATION = 600000; // 10분마다 강제 재연결
  const MAX_CONNECTIONS = 20; // 최대 WebSocket 개수 제한

  let reconnectTimers = {};
  let pendingBuffers = {};
  let isBufferProcessing = {};

  const startPlay = (index, serverIP, camUUID) => {
    const videoEl = document.getElementById(`mse-video-${index}`);
    if (!videoEl) {
      console.warn(`🚨 Video element not found for index ${index}`);
      return;
    }

    if (
      window[`ws_${index}`] &&
      window[`ws_${index}`].readyState === WebSocket.OPEN
    ) {
      console.warn(`⚠️ WebSocket already open for index ${index}`);
      return;
    }

    const mse = new MediaSource();
    videoEl.src = URL.createObjectURL(mse);

    const useWS = serverIP.includes("192.168.0.2");
    const protocol = useWS ? "ws" : "wss";

    const wsUrl = `${protocol}://${serverIP}/stream/${camUUID}/channel/0/mse?uuid=${camUUID}&channel=0`;

    if (window[`ws_${index}`]) {
      console.warn(`❌ Closing existing WebSocket for index ${index}`);
      window[`ws_${index}`].close();
      delete window[`ws_${index}`];
    }

    let ws = new WebSocket(wsUrl);
    window[`ws_${index}`] = ws;
    ws.binaryType = "arraybuffer";

    let mseSourceBuffer = null;
    pendingBuffers[index] = [];
    isBufferProcessing[index] = false;

    ws.onopen = () => {
      console.log(`✅ WebSocket connected: ${wsUrl}`);

      if (reconnectTimers[index]) clearTimeout(reconnectTimers[index]);
      reconnectTimers[index] = setTimeout(() => {
        console.log(`🔄 WebSocket 자동 재연결 (index: ${index})`);
        stopStreamAsync(index).then(() => startPlay(index, serverIP, camUUID));
      }, RECONNECT_INTERVAL);
    };

    ws.onmessage = (event) => {
      pendingBuffers[index].push(event.data);

      if (!isBufferProcessing[index]) {
        isBufferProcessing[index] = true;
        setTimeout(() => {
          while (
            pendingBuffers[index].length > 0 &&
            !mseSourceBuffer?.updating
          ) {
            try {
              mseSourceBuffer.appendBuffer(pendingBuffers[index].shift());
            } catch (error) {
              console.error("🚨 Buffer 처리 오류:", error);
            }
          }
          isBufferProcessing[index] = false;
        }, 50);
      }
    };

    mse.addEventListener("sourceopen", () => {
      ws.onmessage = (event) => {
        const data = new Uint8Array(event.data);

        if (data[0] === 9) {
          const decodedArr = data.slice(1);
          const mimeCodec = new TextDecoder("utf-8").decode(decodedArr);

          try {
            if (!mseSourceBuffer) {
              mseSourceBuffer = mse.addSourceBuffer(
                `video/mp4; codecs="${mimeCodec}"`
              );
              mseSourceBuffer.mode = "segments";

              mseSourceBuffer.addEventListener("updateend", () => {
                if (
                  pendingBuffers[index].length > 0 &&
                  !mseSourceBuffer.updating
                ) {
                  try {
                    mseSourceBuffer.appendBuffer(pendingBuffers[index].shift());
                  } catch (error) {
                    console.error("🚨 Failed to append pending buffer:", error);
                  }
                }
              });

              while (pendingBuffers[index].length > 0) {
                if (!mseSourceBuffer.updating) {
                  mseSourceBuffer.appendBuffer(pendingBuffers[index].shift());
                }
              }
            }
          } catch (error) {
            console.error("🚨 Failed to initialize SourceBuffer:", error);
          }
        } else if (mseSourceBuffer) {
          if (!mseSourceBuffer.updating) {
            try {
              mseSourceBuffer.appendBuffer(event.data);
            } catch (error) {
              console.error("🚨 Failed to append buffer:", error);
            }
          } else {
            pendingBuffers[index].push(event.data);
          }
        }
      };
    });

    ws.onclose = () => {
      console.log(`❌ WebSocket disconnected: ${wsUrl}`);
      if (mse.readyState === "open") {
        try {
          mse.endOfStream();
        } catch (error) {
          console.error("🚨 Failed to close MediaSource:", error);
        }
      }
    };

    ws.onerror = (error) => console.error(`🚨 WebSocket error:`, error);
  };

  const stopStreamAsync = (index) => {
    return new Promise((resolve) => {
      if (!window[`ws_${index}`]) {
        console.warn(`⚠️ No WebSocket found for index ${index}, skipping.`);
        resolve();
        return;
      }

      console.log(`❌ Closing WebSocket for index ${index}...`);

      try {
        const ws = window[`ws_${index}`];

        ws.onclose = () => {
          console.log(`✅ WebSocket closed for index ${index}`);
          delete window[`ws_${index}`];
          setTimeout(resolve, 300); // 닫힌 후 약간의 딜레이 추가 (안정성 확보)
        };

        ws.onerror = (error) => {
          console.error(
            `🚨 WebSocket error while closing: index ${index}`,
            error
          );
          delete window[`ws_${index}`];
          setTimeout(resolve, 300);
        };

        ws.close();
      } catch (error) {
        console.error(`🚨 Error closing WebSocket for index ${index}:`, error);
        setTimeout(resolve, 300);
      }
    });
  };

  const cleanUpWebSockets = () => {
    const activeConnections = Object.keys(window).filter((key) =>
      key.startsWith("ws_")
    );

    if (activeConnections.length > MAX_CONNECTIONS) {
      const oldestIndex = activeConnections[0].split("_")[1];
      stopStreamAsync(oldestIndex);
    }
  };
  setInterval(cleanUpWebSockets, MAX_SESSION_DURATION);

  return (
    <div className="dashboard">
      <div className="wrapper">
        <div className="layout_column">
          <div className="logobox">
            <div className="logo_wrapper">
              <img src={logo} alt="logo" />
              <span>스마트안전관리시스템</span>
              {/* top menu 에서 대시보드 선택할때 보고있던 현장이 맞는지 체크하기 위하여 */}
              {/* <span>{selectedWorkplaceId}</span> */}
            </div>
          </div>
          <div className="box box_safety">
            <div className="titlebox center big title_safety">AI 안전감시</div>
            <div className="innerbox">
              <div className="aicircle">
                <div className="aicircle inner">
                  <div className="backlight"></div>
                  <CustomIcon name="ai" />
                </div>
              </div>
              <div className="colgroup">
                <div className="col">
                  <div className="amount">-</div>
                  <div className="name">안전모미착용</div>
                </div>
                <div className="sepa"></div>
                <div className="col">
                  <div className="amount">-</div>
                  <div className="name">화재위험</div>
                </div>
                <div className="sepa"></div>
                <div className="col">
                  <div className="amount">-</div>
                  <div className="name">개구부접근</div>
                </div>
                <div className="sepa"></div>
                <div className="col">
                  <div className="amount">-</div>
                  <div className="name">작업자쓰러짐</div>
                </div>
                <div className="sepa"></div>
                <div className="col">
                  <div className="amount">-</div>
                  <div className="name">중장비접근</div>
                </div>
              </div>
            </div>
          </div>
          <div className="box">
            {/* 공정률에 대한건 어떻게 뿌리라는거지..? (혜진) */}
            {/* <div className="titlebox">
              <div className="title">공정률</div>
              <div className="btns">
                <button>가설수직구 1#</button>
                <button className="on">가설수직구 2#</button>
              </div>
            </div>
            <div className="innerbox progress">
              <div className="progressbox">
                <div className="percent">22.25%</div>
                <div className="bar">
                  <div className="bar_background">
                    <div
                      className="bar_foreground"
                      style={{ width: "22.25%" }}
                    ></div>
                  </div>
                </div>
                <div className="detail">
                  누적: 52m / 계획: 2,314m / 깊이: 47m
                </div>
              </div>
            </div> */}
            <div className="titlebox smallbox">
              <div className="title">출입현황</div>
            </div>
            <div className="innerbox row">
              {/* 게이트 이미지 고정하는건가?
                현장마다 소속은 제각각인데 스타일이 고정되어있음 (혜진) */}
              <div className="column img">
                <img src={t300} alt="gate" />
              </div>

              {/* 그룹별 컬럼 반복 */}
              {columns.map((chunk, idx) => (
                <div className="column flexstart" key={idx}>
                  <div className="visitbox">
                    <div className="type">
                      {chunk.map((g) => (
                        <span key={g.name}>
                          {g.name.length > 5
                            ? g.name.slice(0, 4) + "…"
                            : g.name}
                        </span>
                      ))}
                    </div>

                    <div className="number">
                      {chunk.map((g) => (
                        <span key={g.name}>{g.count}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* 총 방문 / 잔류 */}
              <div className="column">
                <div className="visitbox">
                  <div className="type">
                    <div>
                      <IonIcon name="IoStatsChart" color="#299F40" />
                      <span>총방문</span>
                    </div>
                    <div>
                      <IonIcon name="IoPerson" color="#299F40" />
                      <span>잔류중</span>
                    </div>
                  </div>
                  <div className="number total">
                    <span>{totalVisit}명</span>
                    <span>{totalStay}명</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="titlebox smallbox">
              <div className="title">출입내역</div>
            </div>
            <div className="tablebox">
              <table>
                <colgroup>
                  <col style={{ width: "27%" }} />
                  <col />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "32%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="alignleft">일시</th>
                    <th>소속</th>
                    <th>이름</th>
                    <th>출입장치</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {row /* 실제 데이터 있을 때 */ ? (
                        <>
                          <td className="alignleft">{row.date}</td>
                          <td>{row.department}</td>
                          <td>{row.name}</td>
                          <td>{row.device}</td>
                        </>
                      ) : (
                        /* 빈 칸 패딩 행 */
                        <>
                          <td className="alignleft">&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="layout_column center">
          <div className="box top">
            <div className="pie">
              <div className="state">
                <div className="backlight"></div>
                <div className="title">현장안전지수</div>
                {/* <div className="stat color1">정상</div> */}
                <div className="stat color1">-</div>
              </div>
              <div
                className="donut"
                style={{
                  "--first": 0.2,
                  "--second": 0.2,
                  "--third": 0.2,
                  "--fourth": 0.2,
                  "--fifth": 0.2,
                }}
              >
                <div className="donut__slice donut__slice__first"></div>
                <div className="donut__slice donut__slice__second"></div>
                <div className="donut__slice donut__slice__third"></div>
                <div className="donut__slice donut__slice__fourth"></div>
                <div className="donut__slice donut__slice__fifth"></div>
              </div>
              <div
                className="donut blur"
                style={{
                  "--first": 0.2,
                  "--second": 0.2,
                  "--third": 0.2,
                  "--fourth": 0.2,
                  "--fifth": 0.2,
                }}
              >
                <div className="donut__slice donut__slice__first"></div>
                <div className="donut__slice donut__slice__second"></div>
                <div className="donut__slice donut__slice__third"></div>
                <div className="donut__slice donut__slice__fourth"></div>
                <div className="donut__slice donut__slice__fifth"></div>
              </div>
            </div>
            <div className="legends">
              <div className="legend">
                <div className="bullet"></div>
                <div className="text">정상</div>
              </div>
              <div className="legend">
                <div className="bullet"></div>
                <div className="text">점검</div>
              </div>
              <div className="legend">
                <div className="bullet"></div>
                <div className="text">주의</div>
              </div>
              <div className="legend">
                <div className="bullet"></div>
                <div className="text">위험</div>
              </div>
              <div className="legend">
                <div className="bullet"></div>
                <div className="text">화재</div>
              </div>
            </div>
          </div>
          <div className="box tran"></div>
        </div>
        <div className="layout_column">
          <div className="watchbox">
            <div className="date">{fDate}</div>
            <div className="time">{fTime}</div>
            <button onClick={handleClose} className="closebtn">
              <IonIcon name="IoClose" />
            </button>
          </div>
          <div className="box">
            <div className="titlebox title_cctv">
              <div className="btns">
                <button className="greybtn">
                  {/* Real-time AI Camera Monitoring */}
                  Real-time Camera Monitoring
                </button>
              </div>
              {/* 돋보기 무슨의미이지 ? (혜진) */}
              {/* <div className="btns right">
                <a>
                  <IonIcon name="IoSearch" size="small" />
                </a>
              </div> */}
            </div>
            <div className="cctvbox">
              {cameraList.length === 0 ? (
                /* 카메라가 하나도 없을 때 */
                <div>카메라 정보가 없습니다.</div>
              ) : (
                /* 카메라가 있을 때 */
                cameraList.map((cam, idx) => (
                  <div className="wrapper videobox" key={cam.camUUID ?? idx}>
                    <video
                      id={`mse-video-${idx}`}
                      className="video"
                      autoPlay
                      muted
                      playsInline
                    />
                    <div className="title">{cam.cameraName}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;
