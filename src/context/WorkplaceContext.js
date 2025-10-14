import React, { createContext, useContext, useEffect, useState } from "react";

// Context 생성
const WorkplaceContext = createContext();

// Provider 생성
export const WorkplaceProvider = ({ children }) => {
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState(null);

  useEffect(() => {
    if (selectedWorkplaceId) {
      localStorage.setItem("selectedWorkplaceId", selectedWorkplaceId);
    }
  }, [selectedWorkplaceId]);

  return (
    <WorkplaceContext.Provider
      value={{ selectedWorkplaceId, setSelectedWorkplaceId }}
    >
      {children}
    </WorkplaceContext.Provider>
  );
};

// Custom Hook 생성
export const useWorkplace = () => useContext(WorkplaceContext);
