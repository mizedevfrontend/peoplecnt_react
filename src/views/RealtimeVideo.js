import React, { useState, useEffect, useMemo, useRef } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import cctvSample from "../images/cctv_no.jpg";
import mic from "../images/img_mic.png";
import IonIcon from "../components/IonIcon";
import apiClient from "../apiClient";
import { fetchPTZMoveControl, fetchPTZZoomControl } from "../api/ptz";
import { useLayoutEffect } from "react";

const gridOptions = [1, 4, 9, 16, 25, 36, 49, 64];

const RealtimeVideo = () => {
  const [isBroad, setIsBroad] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState("idle"); // 'idle' | 'tts' | 'direct' | 'call'
  const [showCenterPanel, setShowCenterPanel] = useState(false); // CONNECTED일 때만 true

  const [gridCount, setGridCount] = useState(16); // 기본 분할은 9로 설정
  const { selectedWorkplaceId } = useWorkplace(); // Context 사용
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [cameraList, setCameraLists] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false); // 모달 표시 여부
  const [modalMessage, setModalMessage] = useState("준비중입니다.");

  const [currentMenu] = useState("realtimeVideo"); // 현재 메뉴 추적
  const [isCheckboxUpdating, setIsCheckboxUpdating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [joyStickDirection, setJoyStickDirection] = useState("stop");
  const [moveSpeed, setMoveSpeed] = useState(3);
  const [containVideo, setContainVideo] = useState(false);
  const ptzWrapperRefs = useRef({});
  const [targets, setTargets] = useState([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState(new Set());
  const [broadcastText, setBroadcastText] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const callArmedRef = useRef(false);
  const statusTimerRef = useRef(null);
  const [lastLineStatus, setLastLineStatus] = useState(null);

  const toNum = (v) => (v == null ? undefined : Number(v));
  const toStatus = (s) => (s == null ? undefined : String(s).toUpperCase());

  // 날짜를 로컬(브라우저) 기준 24시간 문자열로 포맷
  const formatLocal24 = (d = new Date()) => {
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    return (
      `${d.getFullYear()}-` +
      `${pad(d.getMonth() + 1)}-` +
      `${pad(d.getDate())} ` +
      `${pad(d.getHours())}:` +
      `${pad(d.getMinutes())}:` +
      `${pad(d.getSeconds())}.` +
      `${pad(d.getMilliseconds(), 3)}`
    );
  };

  const formatMs = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const ms3 = Math.floor(ms % 1000);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(
      2,
      "0"
    )}.${String(ms3).padStart(3, "0")}`;
  };

  const readField = (obj, keys) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return undefined;
  };
  const normStatus = (v) => {
    const raw = String(v ?? "")
      .toUpperCase()
      .replace(/\s+/g, "");
    // 'CONNECTED-연결', 'CONNECTED - 연결' 등도 CONNECTED로 취급
    if (raw.startsWith("CONNECTED")) return "CONNECTED";
    if (raw.startsWith("DISCONNECTED")) return "DISCONNECTED";
    if (raw.startsWith("CALL_REQUESTED")) return "CALL_REQUESTED";
    if (raw.startsWith("IN_CALL")) return "IN_CALL";
    return raw;
  };

  useEffect(() => {
    if (!selectedWorkplaceId) {
      setTargets([]);
      setSelectedTargetIds(new Set());
      return;
    }
    const fetchTargets = async () => {
      try {
        const res = await apiClient.post(
          "/api/EmergencyCall/all-interphone-list",
          {
            Page: 1,
            PageSize: 100,
            OrderType: 1,
            WorkplaceId: selectedWorkplaceId,
            LoginUserId: localStorage.getItem("userid"),
          }
        );

        const payload =
          typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        const rows = payload?.data ?? [];

        const mapped = rows.map((it) => ({
          InterphoneId: toNum(it.interphoneId),
          InterphoneIp: it.interphoneIp,
          InterphoneNum: toNum(it.interphoneNum),
          InterphoneMac: it.interphoneMac,
          InterphoneName: it.interphoneName,
          InterphoneStatus: toStatus(it.interphoneStatus),
          CallIp: it.callIP,
          CallId: it.callId,
          CallName: it.callName,
          CallNum: toNum(it.callNum),
          CallStatus: toStatus(it.callStatus),
          PbxId: it.pbxID,
          BeApiUrl: it.beApiUrl,
        }));

        setTargets(mapped);
        setSelectedTargetIds(new Set()); // 새로 불러오면 선택 초기화
      } catch (e) {
        console.error("통화장치 목록 조회 실패:", e);
        setTargets([]);
        setSelectedTargetIds(new Set());
      }
    };

    fetchTargets();
  }, [selectedWorkplaceId]);

  const toggleTarget = (id) => {
    const numId = toNum(id);
    setSelectedTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(numId)) next.delete(numId);
      else next.add(numId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedTargetIds((prev) => {
      if (allSelected) return new Set();
      return new Set(targets.map((t) => toNum(t.InterphoneId)));
    });
  };

  const endInterphoneCall = async (targetId) => {
    console.log("☎️ 통화 종료 targetId:", targetId);

    const t = targets.find((x) => x.InterphoneId === targetId);
    if (!t) {
      setModalMessage("인터폰 대상 리스트를 1개만 선택해주세요.");
      setShowPreviewModal(true);
      return;
    }
    if (!t.BeApiUrl || !t.InterphoneNum) {
      setModalMessage("인터폰의 BeApiUrl 또는 내선번호가 없습니다.");
      setShowPreviewModal(true);
      return;
    }
    if (t.CallId == null) {
      setModalMessage("해당 대상의 callId가 없어 통화를 종료할 수 없습니다.");
      setShowPreviewModal(true);
      return;
    }

    try {
      // await apiClient.post(
      //   `/api/v1/phone/hangup`,
      //   {
      //     callId: t.CallId,
      //   },
      //   {
      //     baseURL: t.BeApiUrl,
      //   }
      // );

      // 우리 백엔드 프록시로 일괄 종료 요청 (단일 대상도 batches 1개)
      await apiClient.post("/api/EmergencyCall/hangup-broadcast", {
        batches: [
          {
            baseURL: t.BeApiUrl,
            callIds: [Number(t.CallId)], // 서버 쪽 DTO가 int면 Number로 캐스팅
          },
        ],
      });

      setModalMessage(`통화 연결을 종료했습니다. (내선: ${t.InterphoneNum})`);
      setShowPreviewModal(true);
    } catch (err) {
      console.error("☎️ 통화 시작 실패:", err);
      setModalMessage("통화 시작 중 오류가 발생했습니다.");
      setShowPreviewModal(true);
    } finally {
      setIsBroad(false);
      setBroadcastMode("idle");
      setShowCenterPanel(false);
      callArmedRef.current = false;
    }
  };

  const startInterphoneCall = async (targetId) => {
    console.log("☎️ 통화 시작 targetId:", targetId);

    const t = targets.find((x) => x.InterphoneId === targetId);
    if (!t) {
      setModalMessage("선택한 인터폰을 찾을 수 없습니다.");
      setShowPreviewModal(true);
      return;
    }
    if (!t.BeApiUrl || !t.InterphoneNum) {
      setModalMessage("인터폰의 BeApiUrl 또는 내선번호가 없습니다.");
      setShowPreviewModal(true);
      return;
    }

    try {
      setModalMessage(`통화 연결을 시도했습니다. (내선: ${t.InterphoneNum})`);
      setShowPreviewModal(true);

      // 버튼 클릭 직후 방송 상태 on + 모드 지정
      setIsBroad(true);
      setBroadcastMode("call");
      setShowCenterPanel(true);
      callArmedRef.current = false;

      // await apiClient.get(`/api/v1/phone/${Number(t.InterphoneNum)}/call`, {
      //   baseURL: t.BeApiUrl,
      // });

      await apiClient.post("/api/EmergencyCall/call-start", {
        baseURL: t.BeApiUrl,
        interphoneNumber: Number(t.InterphoneNum),
      });
    } catch (err) {
      console.error("☎️ 통화 시작 실패:", err);
      setModalMessage("통화 시작 중 오류가 발생했습니다.");
      setShowPreviewModal(true);
      setIsBroad(false);
      setBroadcastMode("idle");
      setShowCenterPanel(false);
    }
  };

  const handleDirectSpeakClick = async () => {
    if (isBroad) {
      setModalMessage("이미 방송 중입니다. 잠시만 기다려주세요.");
      setShowPreviewModal(true);
      return;
    }
    if (selectedTargetIds.size < 1) {
      setModalMessage("인터폰 대상 리스트를 선택해주세요.");
      setShowPreviewModal(true);
      return;
    }

    try {
      // 버튼 클릭 직후 방송 상태 on + 모드 지정
      setIsBroad(true);
      setBroadcastMode("direct");
      setShowCenterPanel(true);
      // 1) 선택된 대상 객체들
      const selected = targets.filter((t) =>
        selectedTargetIds.has(t.InterphoneId)
      );

      // 2) BeApiUrl 별로 그룹핑해서 각 서버에 한 번씩만 호출
      const byBase = selected.reduce((acc, t) => {
        console.log("🎯 대상:", {
          InterphoneNum: t.InterphoneNum,
          BeApiUrl: t.BeApiUrl,
        });

        if (!t.BeApiUrl || !t.InterphoneNum) return acc; // 불완전 데이터는 일단 제외
        if (!acc[t.BeApiUrl]) acc[t.BeApiUrl] = new Set();
        acc[t.BeApiUrl].add(Number(t.InterphoneNum)); // 숫자로 캐스팅(스펙이 number 배열)
        return acc;
      }, {});

      const entries = Object.entries(byBase);
      if (entries.length === 0) {
        setModalMessage("직접 송출할 대상의 BeApiUrl 또는 번호가 없습니다.");
        setShowPreviewModal(true);
        setIsBroad(false);
        setBroadcastMode("idle");
        setShowCenterPanel(false);
        return;
      }

      setModalMessage("직접 송출을 시작했습니다.");
      setShowPreviewModal(true);

      // const calls = Object.entries(byBase).map(([baseURL, numsSet]) => {
      //   const nums = Array.from(numsSet);
      //   const callNum = selected.find((t) => t.BeApiUrl === baseURL)?.CallNum;
      //   const finalNums = callNum ? [Number(callNum), ...nums] : nums;
      //   return apiClient.post(
      //     "/api/v1/phone/broadcast",
      //     {
      //       interCallExtensionNumbers: finalNums,
      //     },
      //     { baseURL } // 서버별 개별 호출
      //   );
      // });

      // if (calls.length === 0) {
      //   setModalMessage("직접 송출할 대상의 BeApiUrl 또는 번호가 없습니다.");
      //   setShowPreviewModal(true);
      //   setShowCenterPanel(false);
      //   return;
      // }

      //const results = await Promise.allSettled(calls);

      const batches = entries.map(([baseURL, numsSet]) => {
        const nums = Array.from(numsSet);
        const callNum = selected.find((t) => t.BeApiUrl === baseURL)?.CallNum;
        const finalNums = callNum ? [Number(callNum), ...nums] : nums;
        return { baseURL, interCallExtensionNumbers: finalNums };
      });

      await apiClient.post("/api/EmergencyCall/direct-broadcast", { batches });
    } catch (err) {
      console.error("📡 직접 송출 중 예외:", err);
      setModalMessage("직접 송출 중 오류가 발생했습니다.");
      setShowPreviewModal(true);
      setIsBroad(false);
      setBroadcastMode("idle");
      setShowCenterPanel(false);
    } finally {
    }
  };

  const handleEndCallClick = () => {
    if (selectedTargetIds.size !== 1) {
      setModalMessage("인터폰 대상 리스트를 1개만 선택해주세요.");
      setShowPreviewModal(true);
      return;
    }
    const targetId = Array.from(selectedTargetIds)[0];
    endInterphoneCall(targetId);
  };

  const handleStartCallClick = () => {
    if (isBroad) {
      setModalMessage("이미 방송 중입니다. 잠시만 기다려주세요.");
      setShowPreviewModal(true);
      return;
    }

    const count = selectedTargetIds.size;
    if (count !== 1) {
      setModalMessage("인터폰 대상 리스트를 1개만 선택해주세요.");
      setShowPreviewModal(true);
      return;
    }
    const targetId = Array.from(selectedTargetIds)[0];
    startInterphoneCall(targetId);
  };

  const handlePrepareClick = () => {
    setModalMessage("준비중입니다.");
    setShowPreviewModal(true);
  };

  const handleDirectStopClick = async () => {
    try {
      // const selected = targets.filter((x) =>
      //   selectedTargetIds.has(x.InterphoneId)
      // );
      // await Promise.allSettled(
      //   selected.map((t) =>
      //     apiClient.post(
      //       `/api/v1/phone/hangup`,
      //       { callId: t.CallId },
      //       { baseURL: t.BeApiUrl }
      //     )
      //   )
      // );

      const selected = targets.filter((x) =>
        selectedTargetIds.has(x.InterphoneId)
      );

      const byBase = selected.reduce((acc, t) => {
        if (!t?.BeApiUrl || t?.CallId == null) return acc;
        if (!acc[t.BeApiUrl]) acc[t.BeApiUrl] = new Set();
        acc[t.BeApiUrl].add(Number(t.CallId));
        return acc;
      }, {});

      const baseEntries = Object.entries(byBase); // [ [baseURL, Set<callId>], ... ]
      if (baseEntries.length === 0) {
        setModalMessage("종료할 통화가 없습니다.(callId 미확인)");
        setShowPreviewModal(true);
        return;
      }

      const batches = baseEntries.map(([baseURL, idSet]) => ({
        baseURL,
        callIds: Array.from(idSet),
      }));

      await apiClient.post("/api/EmergencyCall/hangup-broadcast", { batches });

      setModalMessage("직접 방송을 종료했습니다.");
      setShowPreviewModal(true);
    } catch (e) {
      console.error("직접방송 종료 중 오류:", e);
      setModalMessage("직접방송 종료 중 오류가 발생했습니다.");
      setShowPreviewModal(true);
    } finally {
      setIsBroad(false);
      setBroadcastMode("idle");
      setShowCenterPanel(false);
    }
  };

  const handleBroadcastClick = async (type) => {
    if (isBroad) {
      setModalMessage("이미 방송 중입니다. 잠시만 기다려주세요.");
      setShowPreviewModal(true);
      return;
    }
    if (selectedTargetIds.size < 1) {
      setModalMessage("인터폰 대상 리스트를 선택해주세요.");
      setShowPreviewModal(true);
      return;
    }

    if (!broadcastText.trim()) {
      setModalMessage("방송할 문구를 입력해주세요.");
      setShowPreviewModal(true);
      return;
    }

    const selected = targets.filter((t) =>
      selectedTargetIds.has(t.InterphoneId)
    );
    const targetIds = selected.map((t) => t.InterphoneId);

    if (type === "preview") {
      console.log("🔊 미리듣기:", {
        targetIds: selected.map((s) => s.InterphoneId),
        text: broadcastText,
      });
      // TODO: 미리듣기 API가 있다면 여기에 호출
      return;
    }

    // === 실제 송출 ===
    try {
      // 버튼 클릭 직후 방송 상태 on + 모드 지정
      setIsBroad(true);
      setBroadcastMode("tts");
      setShowCenterPanel(true);

      // 1) 선택된 대상 객체들
      const selected = targets.filter((t) =>
        selectedTargetIds.has(t.InterphoneId)
      );

      // 2) BeApiUrl 별로 그룹핑해서 각 서버에 한 번씩만 호출
      const byBase = selected.reduce((acc, t) => {
        console.log("🎯 대상:", {
          InterphoneNum: t.InterphoneNum,
          BeApiUrl: t.BeApiUrl,
        });

        if (!t.BeApiUrl || !t.InterphoneNum) return acc; // 불완전 데이터는 일단 제외
        if (!acc[t.BeApiUrl]) acc[t.BeApiUrl] = new Set();
        acc[t.BeApiUrl].add(Number(t.InterphoneNum)); // 숫자로 캐스팅(스펙이 number 배열)
        return acc;
      }, {});
      const entries = Object.entries(byBase);
      if (entries.length === 0) {
        setModalMessage("송출할 대상의 BeApiUrl 또는 번호가 없습니다.");
        setShowPreviewModal(true);
        setIsBroad(false);
        setBroadcastMode("idle");
        setShowCenterPanel(false);
        return;
      }

      setModalMessage("TTS 송출을 시작했습니다.");
      setShowPreviewModal(true);

      // const calls = Object.entries(byBase).map(([baseURL, numsSet]) => {
      //   const nums = Array.from(numsSet);
      //   return apiClient.post(
      //     "/api/v1/phone/broadcast/tts",
      //     {
      //       interCallExtensionNumbers: nums,
      //       speechText: broadcastText.trim(),
      //     },
      //     { baseURL } // 서버별 개별 호출
      //   );
      // });

      // if (calls.length === 0) {
      //   setModalMessage("송출할 대상의 BeApiUrl 또는 번호가 없습니다.");
      //   setShowPreviewModal(true);
      //   setIsBroad(false);
      //   setBroadcastMode("idle");
      //   setShowCenterPanel(false);
      //   return;
      // }

      // const results = await Promise.allSettled(calls);

      const baseEntries = Object.entries(byBase);
      const batches = baseEntries.map(([baseURL, numsSet]) => ({
        baseURL,
        interCallExtensionNumbers: Array.from(numsSet),
        speechText: broadcastText.trim(),
      }));

      await apiClient.post("/api/EmergencyCall/tts-broadcast", { batches });
    } catch (err) {
      console.error("📡 송출 중 예외:", err);
      setModalMessage("송출 중 오류가 발생했습니다.");
      setShowPreviewModal(true);
      setIsBroad(false);
      setBroadcastMode("idle");
      setShowCenterPanel(false);
    } finally {
      //
    }
  };

  useEffect(() => {
    const clearTimer = () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };

    if (!isBroad) {
      clearTimer();
      setShowCenterPanel(false);
      setLastLineStatus(null);
      return;
    }

    const idFrom = (rec) => toNum(rec.interphoneId);

    const bothConnected = (rec) => {
      const a = normStatus(rec.interphoneStatus);
      const b = normStatus(rec.callStatus);
      return a === "CONNECTED" && b === "CONNECTED";
    };

    const poll = async () => {
      try {
        const res = await apiClient.post(
          "/api/EmergencyCall/interphone-status",
          {
            Page: 1,
            PageSize: 100,
            OrderType: 1,
            WorkplaceId: selectedWorkplaceId,
            LoginUserId: localStorage.getItem("userid"),
            InterphoneIds: Array.from(selectedTargetIds),
          }
        );

        const payload =
          typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        const rows =
          payload?.data ??
          payload?.rows ??
          payload?.result ??
          payload?.items ??
          payload;

        const arr = Array.isArray(rows) ? rows : rows ? [rows] : [];
        setLastLineStatus(arr);

        //if (arr.length) console.log("status keys:", Object.keys(arr[0]));

        const onlySelected =
          selectedTargetIds.size > 0
            ? arr.filter((r) => selectedTargetIds.has(idFrom(r)))
            : arr;

        if (broadcastMode === "call") {
          const anyCallNotConnected = onlySelected.some(
            (r) => normStatus(r.callStatus) !== "CONNECTED"
          );
          if (anyCallNotConnected) callArmedRef.current = true;

          const allBothConnected =
            onlySelected.length > 0 && onlySelected.every(bothConnected);

          const shouldHide = callArmedRef.current && allBothConnected;

          if (shouldHide) {
            setShowCenterPanel(false);
            setIsBroad(false);
            setBroadcastMode("idle");
            callArmedRef.current = false;
          } else {
            setShowCenterPanel(true);
          }
        } else {
          // TTS/직접방송
          const shouldHide =
            onlySelected.length > 0 && onlySelected.every(bothConnected);
          //setShowCenterPanel(!shouldHide);
          if (shouldHide) {
            setShowCenterPanel(false);
            setIsBroad(false);
            setBroadcastMode("idle");
          } else {
            setShowCenterPanel(true);
          }
        }
      } catch (e) {
        console.error("status poll error", e);
        // 에러 시 표시 유지/해제 정책은 필요에 따라 조정
      }
    };

    // 즉시 1회 + 4초 주기 폴링
    //poll();
    statusTimerRef.current = setInterval(poll, 3000);

    return () => clearTimer();
  }, [isBroad, selectedTargetIds, selectedWorkplaceId, broadcastMode]);

  // 진행시간 타이머: 패널이 실제 표시될 때만 경과시간 표시
  useEffect(() => {
    let id;
    if (showCenterPanel) {
      const start = Date.now();
      setElapsedMs(0);
      id = setInterval(() => setElapsedMs(Date.now() - start), 100);
    } else {
      setElapsedMs(0);
    }
    return () => id && clearInterval(id);
  }, [showCenterPanel]);

  const selectedCount = selectedTargetIds.size;
  const totalCount = targets.length;
  const allSelected = totalCount > 0 && selectedTargetIds.size === totalCount;

  useEffect(() => {
    const movePTZ = async () => {
      if (expandedIndex === null) return;
      if (cameraList[expandedIndex]?.ptzYN !== "Y") return;

      try {
        const res = await fetchPTZMoveControl(
          cameraList[expandedIndex]?.camChannel,
          joyStickDirection,
          moveSpeed
        );
        console.log("📡 PTZ 이동:", res?.data?.result || res);
      } catch (err) {
        console.error("🚨 PTZ 이동 실패:", err);
      }
    };

    if (joyStickDirection !== "stop") {
      movePTZ();
    }
  }, [joyStickDirection, expandedIndex]);

  const handleZoom = async (mode) => {
    if (expandedIndex === null) return;
    if (cameraList[expandedIndex]?.ptzYN !== "Y") return;

    try {
      const res = await fetchPTZZoomControl(
        cameraList[expandedIndex]?.camChannel,
        mode
      );
      console.log(`🔍 Zoom ${mode}:`, res?.data || res);
    } catch (err) {
      console.error("🚨 Zoom 제어 실패:", err);
    }
  };

  useEffect(() => {
    const stopAllStreams = async () => {
      const activeKeys = Object.keys(window).filter((k) => k.startsWith("ws_"));
      await Promise.all(
        activeKeys.map((key) => {
          const idx = parseInt(key.split("_")[1], 10);
          return stopStreamAsync(idx);
        })
      );
    };

    const fetchCameraLists = async () => {
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
          setSelectedCameras([]);
          return;
        }

        console.log("📷 카메라 리스트 업데이트", response.data);

        const categories = responseData.data.map((item) => ({
          cameraID: item.camId,
          cameraName: item.camPosition,
          camUrl: item.camURL,
          serverIP: item.serverIP,
          camUUID: item.camUUID,
          ptzYN: item.ptzYN,
          camChannel: item.camChannel,
        }));

        setCameraLists(categories);
        setSelectedCameras(categories.map((_, i) => i < gridCount));

        setTimeout(() => {
          categories.forEach((camera, index) => {
            if (index < gridCount) {
              console.log(`📡 WebSocket 재연결 시도: index ${index}`);
              startPlay(index, camera.serverIP, camera.camUUID);
            }
          });
        }, 500);
      } catch (error) {
        console.error("🚨 Failed to fetch camera lists:", error);
      }
    };

    fetchCameraLists();
  }, [selectedWorkplaceId, currentMenu]);

  useEffect(() => {
    setSelectedCameras((prev) => {
      return cameraList.map((_, i) =>
        i < gridCount ? prev[i] || false : false
      );
    });

    setTimeout(() => {
      Promise.all(cameraList.map((_, index) => stopStreamAsync(index))).then(
        () => {
          cameraList.forEach((camera, index) => {
            if (selectedCameras[index]) {
              console.log(`🔄 WebSocket 다시 시작: index ${index}`);
              startPlay(index, camera.serverIP, camera.camUUID);
            }
          });
        }
      );
    }, 500);
  }, [gridCount, cameraList]);

  useEffect(() => {
    if (isCheckboxUpdating) return;

    const restartWebSockets = async () => {
      console.log("🛑 Stopping all WebSockets before reconnecting...");

      await Promise.all(cameraList.map((_, index) => stopStreamAsync(index)));

      console.log("All WebSockets fully closed. Now reconnecting...");

      setTimeout(() => {
        if (cameraList.length === 0 || selectedCameras.length === 0) {
          console.warn(
            "⚠️ No cameras available. Skipping WebSocket reconnection."
          );
          return;
        }

        cameraList.forEach((camera, index) => {
          if (selectedCameras[index]) {
            console.log(`🔄 Reconnecting WebSocket for index ${index}`);
            startPlay(index, camera.serverIP, camera.camUUID);
          }
        });
      }, 1000);
    };

    restartWebSockets();
  }, [selectedWorkplaceId, currentMenu, cameraList, selectedCameras]);

  const gridItems = useMemo(() => {
    return Array.from({ length: gridCount }, (_, i) => {
      return selectedCameras[i] ? cameraList[i] : null;
    });
  }, [gridCount, selectedCameras, cameraList]);

  const handleGridOptionClick = (option) => {
    setGridCount(option);

    setSelectedCameras((prev) => {
      const updatedSelection = cameraList.map((_, i) =>
        i < option ? prev[i] : false
      );
      return updatedSelection;
    });

    setIsCheckboxUpdating(false);
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
      console.warn(`Video element not found for index ${index}`);
      return;
    }

    if (
      window[`ws_${index}`] &&
      window[`ws_${index}`].readyState === WebSocket.OPEN
    ) {
      console.warn(`WebSocket already open for index ${index}`);
      return;
    }

    const mse = new MediaSource();
    videoEl.src = URL.createObjectURL(mse);

    //alert(serverIP);

    const useWS = serverIP.includes("192.168.0.2");
    const protocol = useWS ? "ws" : "wss";
    //const wsUrl = `ws://${serverIP}:8083/stream/${camUUID}/channel/0/mse?uuid=${camUUID}&channel=0`;
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
      console.log(`WebSocket connected: ${wsUrl}`);

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
              console.error("Buffer 처리 오류:", error);
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
                    console.error("Failed to append pending buffer:", error);
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
            console.error("Failed to initialize SourceBuffer:", error);
          }
        } else if (mseSourceBuffer) {
          if (!mseSourceBuffer.updating) {
            try {
              mseSourceBuffer.appendBuffer(event.data);
            } catch (error) {
              console.error("Failed to append buffer:", error);
            }
          } else {
            pendingBuffers[index].push(event.data);
          }
        }
      };
    });

    ws.onclose = () => {
      console.log(`WebSocket disconnected: ${wsUrl}`);
      if (mse.readyState === "open") {
        try {
          mse.endOfStream();
        } catch (error) {
          console.error(" Failed to close MediaSource:", error);
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
          setTimeout(resolve, 300);
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
  //  setInterval(cleanUpWebSockets, MAX_SESSION_DURATION);
  useEffect(() => {
    const id = setInterval(cleanUpWebSockets, MAX_SESSION_DURATION);
    return () => clearInterval(id);
  }, []);

  const handleCameraToggle = (index) => {
    setIsCheckboxUpdating(true);

    setSelectedCameras((prev) => {
      const newSelectedCameras = [...prev];
      newSelectedCameras[index] = !newSelectedCameras[index];

      const selectedIndexes = newSelectedCameras
        .map((isSelected, idx) => (isSelected ? idx : -1))
        .filter((idx) => idx !== -1);

      if (selectedIndexes.length > 0) {
        const maxSelectedIndex = Math.max(...selectedIndexes);
        if (maxSelectedIndex >= gridCount) {
          const nextGrid = gridOptions.find(
            (option) => option >= maxSelectedIndex + 1
          );
          if (nextGrid && nextGrid !== gridCount) {
            setGridCount(nextGrid);
          }
        }
      }

      return newSelectedCameras;
    });

    const camera = cameraList[index];
    if (!camera) {
      setIsCheckboxUpdating(false); // ✅ 체크박스 업데이트 완료
      return;
    }

    const videoEl = document.getElementById(`mse-video-${index}`);
    if (!selectedCameras[index]) {
      if (videoEl) {
        videoEl.style.visibility = "visible";
        videoEl.style.opacity = "1";
      }
      if (!window[`ws_${index}`]) {
        startPlay(index, camera.serverIP, camera.camUUID);
      }
    } else {
      if (videoEl) {
        videoEl.style.visibility = "hidden";
        videoEl.style.opacity = "0";
      }
    }

    setTimeout(() => {
      setIsCheckboxUpdating(false);
    }, 100);
  };

  //영상확대하기: 더블클릭 하거나, 터치한채 0.7초 지나거나..
  const handleVideoDoubleClick = (index) => {
    setExpandedIndex((prev) => {
      const next = prev === index ? null : index;
      if (next === null) {
        setJoyStickDirection("stop"); // 확대 해제 시 PTZ 중지
      }
      return next;
    });
  };
  let longPressTimer = null;

  const handleVideoPressStart = (index) => {
    longPressTimer = setTimeout(() => {
      setExpandedIndex((prev) => (prev === index ? null : index));
    }, 700);
  };

  const handleVideoPressCancel = () => {
    clearTimeout(longPressTimer);
  };

  // ptz 관련
  useLayoutEffect(() => {
    if (expandedIndex === null) return;

    let rafId;

    const tryBindPTZEvents = () => {
      const el = ptzWrapperRefs.current[expandedIndex];
      if (!el) {
        rafId = requestAnimationFrame(tryBindPTZEvents);
        return;
      }

      console.log("📡 PTZ 이동 1");

      let startX = 0;
      let startY = 0;
      let dragging = false;

      const handleMove = (dx, dy) => {
        if (Math.abs(dx) > Math.abs(dy)) {
          setJoyStickDirection(dx > 1 ? "LEFT" : dx < -1 ? "RIGHT" : "stop");
        } else {
          setJoyStickDirection(dy > 1 ? "UP" : dy < -1 ? "DOWN" : "stop");
        }
      };

      console.log("📡 PTZ 이동 2");

      const handleMouseDown = (e) => {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
      };

      console.log("📡 PTZ 이동 3");

      const handleMouseMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        handleMove(dx, dy);
      };

      console.log("📡 PTZ 이동 4");

      const handleMouseUp = () => {
        if (dragging) {
          dragging = false;
          handleZoom("stop");
          console.log("🛑 PTZ 1 이동 멈춤 (mouseup)");
        }
      };

      console.log("📡 PTZ 이동 5");
      const handleTouchStart = (e) => {
        dragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      };

      console.log("📡 PTZ 이동 6");

      const handleTouchMove = (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        handleMove(dx, dy);
      };

      console.log("📡 PTZ 이동 7");
      const handleTouchEnd = () => {
        dragging = false;
        handleZoom("stop");
        console.log("🛑 PTZ 2 이동 멈춤 (mouseup)");
      };

      console.log("📡 PTZ 이동 8");
      el.addEventListener("mousedown", handleMouseDown);
      el.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      el.addEventListener("touchstart", handleTouchStart);
      el.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);

      // 클린업
      return () => {
        el.removeEventListener("mousedown", handleMouseDown);
        el.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    };

    rafId = requestAnimationFrame(tryBindPTZEvents);

    return () => cancelAnimationFrame(rafId);
  }, [expandedIndex]);

  return (
    <div className="videos_wrapper">
      <div className="videos_topbox">
        <div
          className={`videos_videos ${containVideo ? "contain" : null}`}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.sqrt(gridCount)}, 1fr)`,
          }}
        >
          {gridItems.map((camera, index) => (
            <div key={index} className="videos_video">
              {expandedIndex === index &&
              cameraList[expandedIndex]?.ptzYN === "Y" ? (
                <div
                  className="ptz_wrapper"
                  ref={(el) => (ptzWrapperRefs.current[index] = el)}
                  onDoubleClick={() => handleVideoDoubleClick(index)}
                >
                  <div className="ptz_box">
                    <div className="ptz_topbox">
                      <button
                        onClick={() => {
                          setJoyStickDirection("UP");
                          setTimeout(() => {
                            handleZoom("stop");
                          }, 1500);
                        }}
                      >
                        <IonIcon name="IoChevronUp" size={40} />
                      </button>
                    </div>
                    <div className="ptz_middlebox">
                      <div className="ptz_innerbox">
                        <button
                          onClick={() => {
                            setJoyStickDirection("LEFT");
                            setTimeout(() => {
                              handleZoom("stop");
                            }, 1500);
                          }}
                        >
                          <IonIcon name="IoChevronBack" size={40} />
                        </button>
                      </div>
                      <div className="ptz_innerbox half">
                        <button
                          onMouseDown={() => handleZoom("in")}
                          onMouseUp={() => handleZoom("stop")}
                        >
                          <IonIcon name="IoAdd" size={40} />
                        </button>
                        <button
                          onMouseDown={() => handleZoom("out")}
                          onMouseUp={() => handleZoom("stop")}
                        >
                          <IonIcon name="IoRemove" size={40} />
                        </button>
                      </div>
                      <div className="ptz_innerbox">
                        <button
                          onClick={() => {
                            setJoyStickDirection("RIGHT");
                            setTimeout(() => {
                              handleZoom("stop");
                            }, 1500);
                          }}
                        >
                          <IonIcon name="IoChevronForward" size={40} />
                        </button>
                      </div>
                    </div>
                    <div className="ptz_bottombox">
                      <button
                        onClick={() => {
                          setJoyStickDirection("DOWN");
                          setTimeout(() => {
                            handleZoom("stop");
                          }, 1500);
                        }}
                      >
                        <IonIcon name="IoChevronDown" size={40} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <video
                id={`mse-video-${index}`}
                autoPlay
                muted
                playsInline
                onDoubleClick={() => handleVideoDoubleClick(index)}
                onTouchStart={() => handleVideoPressStart(index)}
                onTouchEnd={handleVideoPressCancel}
                onTouchMove={handleVideoPressCancel}
                style={{
                  display: selectedCameras[index] ? "block" : "none",
                  ...(expandedIndex === index
                    ? {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        zIndex: 500,
                      }
                    : {}),
                }}
              />

              {!selectedCameras[index] && <img src={cctvSample} alt="video" />}
            </div>
          ))}
        </div>
        <div className="videos_top_right">
          <div className="videos_countbtns sectionbox">
            <div className="boxtitle">
              <div>분할방식</div>
              <button
                className="righttop_btn"
                onClick={
                  containVideo
                    ? () => setContainVideo(false)
                    : () => setContainVideo(true)
                }
              >
                창에 맞추기
              </button>
            </div>
            <div className="videos_box_btns">
              {gridOptions.map((option) => (
                <button
                  key={option}
                  className={gridCount === option ? "on" : ""}
                  onClick={() => handleGridOptionClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="videos_list sectionbox">
            <div className="boxtitle">카메라목록</div>
            <div className="box_list">
              <div className="box_list_headers">
                <div className="box_list_header" style={{ flex: 3 }}>
                  카메라이름
                </div>
                <div className="box_list_header" style={{ flex: 1 }}>
                  표시여부
                </div>
              </div>
              <div className="box_list_body">
                {cameraList.length === 0 ? (
                  <div>카메라 정보가 없습니다</div>
                ) : (
                  cameraList.map((camera, index) => (
                    <div key={index} className="box_list_row">
                      <div className="box_list_column" style={{ flex: 3 }}>
                        {camera.cameraName}
                      </div>
                      <div className="box_list_column" style={{ flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedCameras[index] || false}
                          onChange={() => handleCameraToggle(index)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="videos_bottombox">
        <div className="videos_broad_target">
          <div className="videos_titlebox btnbox">
            <div className="boxtitle">대상선택</div>
            <div className="videos_titlebtns">
              <div>
                <span className="accent">{selectedCount}</span>
                <span>/{totalCount}</span>
                <span className="accent"></span>
                <span></span>
              </div>
              <button
                className="videos_titlebtn"
                onClick={toggleSelectAll}
                disabled={totalCount === 0}
              >
                {allSelected ? "전체해제" : "전체선택"}
              </button>
            </div>
          </div>
          {/* InterphoneId: it.interphoneId,
          InterphoneIp: it.interphoneIp,
          InterphoneNum: it.interphoneNum,
          InterphoneMac: it.interphoneMac,
          InterphoneName: it.interphoneName,
          InterphoneStatus: it.interphoneStatus,
          CallIp: it.callIP,
          CallId: it.callId,
          CallName: it.callName,
          CallNum: it.callNum,
          PbxId: it.pbxID, */}

          <div className="videos_target_list">
            {targets.length === 0 ? (
              <div className="videos_target_item">통화장치 정보가 없습니다</div>
            ) : (
              targets.map((t) => {
                const on = selectedTargetIds.has(t.InterphoneId);
                return (
                  <div
                    key={t.InterphoneId}
                    className={`videos_target_item relative ${on ? "on" : ""}`}
                    onClick={() => toggleTarget(t.InterphoneId)}
                  >
                    {t.InterphoneName} ({t.InterphoneNum})
                    <IonIcon name="IoCheckmark" size={20} />
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="broadcastbox sectionbox btnbox">
          <div className="broadcast_leftbox">
            <div className="boxtitle">TTS(AI음성) 방송하기</div>
            <textarea
              placeholder="방송할 문구를 입력해주세요."
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
            />
            <div className="tts_btns">
              {/* <button onClick={() => handleBroadcastClick("preview")}>
                미리듣기
              </button> */}
              <button
                onClick={() => handleBroadcastClick("send")}
                disabled={isBroad}
              >
                송출하기
              </button>
            </div>
          </div>
          <div className="broadcast_centerbox">
            <div className="broad_mic relative">
              <img src={mic} alt="mic" />
              {isBroad && showCenterPanel && (
                <>
                  <div className="light"></div>
                  <div className="duration_sec">{formatMs(elapsedMs)}</div>
                </>
              )}
            </div>
            <div className="broadcast_center_btns">
              {isBroad && showCenterPanel ? (
                <>
                  <button>진행중</button>
                  {broadcastMode === "direct" && (
                    <button className="btn_red" onClick={handleDirectStopClick}>
                      송출종료
                    </button>
                  )}
                </>
              ) : (
                <button>대기중</button>
              )}
            </div>
          </div>
          <div className="broadcast_rightbox">
            <div className="boxtitle">직접방송하기</div>
            <button
              className="broad_speak_btn r"
              onClick={handleDirectSpeakClick}
              disabled={isBroad}
            >
              <IonIcon name="IoMicOutline" size={80} />
              직접송출 시작하기
            </button>
          </div>
        </div>
        <div className="callbox sectionbox btnbox">
          <div className="boxtitle">음성통화</div>
          <div className="call_btns">
            <div className="call_btns_left">
              <button className="r" onClick={handleStartCallClick}>
                <IonIcon name="IoCall" size={40} color="#15E041" />
                <span>통화시작</span>
              </button>
            </div>
            <div className="call_btns_left">
              <button className="r" onClick={handleEndCallClick}>
                <IonIcon name="IoRemoveCircle" size={40} color="FF4949" />
                <span>통화종료</span>
              </button>
            </div>
            {/* <div className="call_btns_right">
               <button className="r" onClick={handlePrepareClick}>
                <IonIcon name="IoCellular" size={50} />
                <div>
                  <div>연결상태</div>
                  <div>
                    <span className="accent">-</span>/-
                  </div>
                </div>
              </button> 
            </div> */}
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <div
          onClick={() => setShowPreviewModal(false)}
          className="modal_dimmbox"
        >
          <div onClick={(e) => e.stopPropagation()} className="popup">
            <div className="popheader">
              <div className="titlebox">
                <div className="poptitle">알림</div>
                <button onClick={() => setShowPreviewModal(false)}>
                  <IonIcon name="IoClose" size={40} />
                </button>
              </div>
            </div>
            <div className="popbody">
              <div className="pop_textbox">{modalMessage}</div>
            </div>
            <div className="popfooter">
              <div className="bottombtns pop">
                <button onClick={() => setShowPreviewModal(false)}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeVideo;
