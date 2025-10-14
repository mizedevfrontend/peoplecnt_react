import React, { useState, useEffect, useCallback } from "react";
import { useWorkplace } from "../context/WorkplaceContext";
import apiClient from "../apiClient";
import SvgIcons from "../layouts/SvgIcons";

const Left = React.memo(() => {
  const [areas, setAreas] = useState([]);
  const [expandedAreaIds, setExpandedAreaIds] = useState([]);
  const { selectedWorkplaceId, setSelectedWorkplaceId } = useWorkplace();

  const fetchWorkplaces = useCallback(async () => {
    try {
      const params = {
        Page: 1,
        PageSize: 100,
        OrderType: 1,
        LoginUserId: localStorage.getItem("userid") || "defaultUser",
        RecordCount: 0,
      };

      const response = await apiClient.post(
        "/api/WorkPlace/all-workplace-list",
        params
      );

      const data =
        typeof response.data === "string"
          ? JSON.parse(response.data)?.data || []
          : response.data?.data || [];

      console.log(response.data);

      const groupedData = data.reduce((acc, curr) => {
        const areaId = curr.areaId;
        if (!acc[areaId]) {
          acc[areaId] = { areaName: curr.areaName, workplaces: [] };
        }
        acc[areaId].workplaces.push({
          workplaceId: curr.workplaceId,
          companyName: curr.companyName,
          workplaceName: curr.workplaceName,
          activateYn: curr.activateYN,
          createdDtm: curr.createdDtm,
          inCnt: curr.inCnt,
          Addr: curr.addr,
          Latitude: curr.latitude,
          Longitude: curr.longitude,
        });
        return acc;
      }, {});

      const areasData = Object.keys(groupedData).map((key) => ({
        areaId: key,
        areaName: groupedData[key].areaName,
        workplaces: groupedData[key].workplaces,
      }));

      setAreas(areasData);
      setExpandedAreaIds(areasData.map((area) => area.areaId));

      // 이미 선택된 현장이 없거나, 새로 받아온 데이터에 존재하지 않으면 초기값 설정
      if (
        (!selectedWorkplaceId ||
          !areasData.some((area) =>
            area.workplaces.find(
              (workplace) => workplace.workplaceId === selectedWorkplaceId
            )
          )) &&
        areasData.length > 0 &&
        areasData[0].workplaces.length > 0
      ) {
        setSelectedWorkplaceId(areasData[0].workplaces[0].workplaceId);
      }
    } catch (error) {
      console.error("Failed to fetch workplaces:", error);
    }
  }, [selectedWorkplaceId, setSelectedWorkplaceId]);

  useEffect(() => {
    fetchWorkplaces();
  }, [fetchWorkplaces]);

  // 5초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWorkplaces();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchWorkplaces]);

  const handleAreaClick = (areaId) => {
    setExpandedAreaIds((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleWorkplaceClick = (workplaceId) => {
    setSelectedWorkplaceId(workplaceId);
  };

  return (
    <div className="bodyleft">
      <div className="leftnav">
        {areas.map((area) => (
          <div key={area.areaId} className="leftgroup">
            <div className="title" onClick={() => handleAreaClick(area.areaId)}>
              <div>{area.areaName}</div>
              <div>
                {expandedAreaIds.includes(area.areaId) ? (
                  <SvgIcons icon="chevroff" />
                ) : (
                  <SvgIcons icon="chevron" />
                )}
              </div>
            </div>
            {expandedAreaIds.includes(area.areaId) && (
              <div className="btns">
                {area.workplaces.map((workplace) => (
                  <a
                    role="button"
                    key={workplace.workplaceId}
                    className={`btn ${
                      selectedWorkplaceId === workplace.workplaceId ? "on" : ""
                    }`}
                    onClick={() => handleWorkplaceClick(workplace.workplaceId)}
                  >
                    <div className="column">
                      <div className="square"></div>
                    </div>
                    <div className="column">
                      <div className="stats">
                        {/* square/stat - 초롱
square color2b/stat color2 - 노랑
square color3b/stat color3 - 연보라
square color4b/stat color4 - 연분홍
square color5b/stat color5 - 빨강 */}
                        <div className="stat">{workplace.companyName}</div>
                        {/* <div className="stay">체류인원: {workplace.inCnt}</div> */}
                      </div>
                      <div className="name">{workplace.workplaceName}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="leftfooter"></div>
    </div>
  );
});

export default Left;
