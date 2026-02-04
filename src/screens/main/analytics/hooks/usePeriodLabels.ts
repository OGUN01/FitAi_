import { Period } from "../PeriodSelector";

export const usePeriodLabels = (period: Period): string[] => {
  switch (period) {
    case "week":
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    case "month":
      return ["W1", "W2", "W3", "W4"];
    case "quarter":
      return ["M1", "M2", "M3"];
    case "year":
      return ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
    default:
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }
};
