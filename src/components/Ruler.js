import React, { useEffect, useRef, useState } from "react";

// import 아래
const PRIORITY_NAMES = ["광차 하얀", "광차 노랑"];
const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase();
const priNameSet = new Set(PRIORITY_NAMES.map(norm));

function orderWorkersByName(arr = []) {
  const top = [];
  const rest = [];
  for (const w of arr) (priNameSet.has(norm(w.name)) ? top : rest).push(w);
  return [...top, ...rest];
}
const PRIORITY_CLASS_MAP = new Map([
  [norm("광차 하얀"), "pri-white"],
  [norm("광차 노랑"), "pri-yellow"],
]);

const Ruler = ({
  length,
  labelInterval,
  tickInterval = 40,
  tickHeight = 5,
  labelOffset = 12,
  style = { width: "100%" },
  intervals = [],
  direction = "ltr",
  setIsListPopupOpen,
}) => {
  const containerRef = useRef(null);
  const [realWidth, setRealWidth] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setRealWidth(width);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const ticks = [];
  const boxes = [];

  if (realWidth != null) {
    const scale = realWidth / length;
    const calcLeft = (val) =>
      direction === "ltr"
        ? val * scale
        : realWidth - (val + labelInterval) * scale;

    for (let i = 0; i <= length; i += tickInterval) {
      const left = direction === "ltr" ? i * scale : realWidth - i * scale;
      const isLabel = i % labelInterval === 0;

      ticks.push(
        <div
          key={`tick-${i}`}
          style={{
            position: "absolute",
            left: `${left}px`,
            width: "3px",
            borderRadius: "5px",
            height: `${isLabel ? tickHeight * 2 : tickHeight}px`,
            backgroundColor: "#fff",
          }}
        />
      );

      if (isLabel) {
        ticks.push(
          <div
            key={`label-${i}`}
            style={{
              position: "absolute",
              left: `${left - 10}px`,
              top: `${tickHeight + labelOffset}px`,
              fontSize: "1em",
              color: "#fff",
            }}
          >
            {i}
          </div>
        );
      }
    }

    for (let i = 0; i < length; i += labelInterval) {
      const left = calcLeft(i);
      const width = labelInterval * scale;

      const interval = intervals.find((item) => item.start === i);
      const workers = interval?.workers || [];
      const workerCount = workers.length;

      boxes.push(
        <div
          key={`box-${i}`}
          className="interval_box"
          onClick={() => setIsListPopupOpen(true)}
          style={{
            top: `${tickHeight + labelOffset + 20}px`,
            left: `${left}px`,
            width: `${width}px`,
          }}
        >
          <div
            className={
              workers.length > 0
                ? "btn_worker_number"
                : "btn_worker_number noworker"
            }
          >
            <span style={{ fontWeight: 300 }}>작업자</span>
            <span style={{ fontSize: "1.2em" }}>{workerCount}명</span>
          </div>
          <div className="box_workers">
            {orderWorkersByName(workers).map((w) => {
              const priClass = PRIORITY_CLASS_MAP.get(norm(w.name)) || "";
              return (
                <div
                  key={w.employee_id ?? w.id ?? w.name}
                  className={`worker ${
                    w.callflag === 1 ? "blink" : ""
                  } ${priClass}`}
                >
                  {w.name}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height: "100%",
        direction: direction === "rtl" ? "rtl" : "ltr",
        ...style,
      }}
    >
      {realWidth != null ? [...ticks, ...boxes] : null}
    </div>
  );
};

export default Ruler;
