export const STEPS = [
  { num: 1, name: "Brand Entry" }, { num: 2, name: "SDG Mapping" }, { num: 3, name: "SDG Selection" },
  { num: 4, name: "Reality Check" }, { num: 5, name: "Target Research" }, { num: 6, name: "Data Research" },
  { num: 7, name: "Springboards" }, { num: 8, name: "Partnerships" }, { num: 9, name: "Idea Development" },
  { num: 10, name: "Business Impact" }, { num: 11, name: "ROI Estimation" }, { num: 12, name: "Case Board" },
];
export function getCurrentStep(n: number) { return STEPS.find(s => s.num === n); }
export function isTerminalStep(n: number) { return n >= 12; }
