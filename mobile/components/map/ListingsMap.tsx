import { Platform } from "react-native";

const ListingsMap =
  Platform.OS === "web"
    ? require("./ListingsMap.web").default
    : require("./ListingsMap.native").default;

export default ListingsMap;
