const RAIL_EVENT = "agentforge:right-rail-open";

export const announceRailOpen = (name) => {
  window.dispatchEvent(new CustomEvent(RAIL_EVENT, { detail: name }));
};

export const onOtherRailOpen = (name, close) => {
  const handler = (e) => {
    if (e.detail !== name) close();
  };
  window.addEventListener(RAIL_EVENT, handler);
  return () => window.removeEventListener(RAIL_EVENT, handler);
};
