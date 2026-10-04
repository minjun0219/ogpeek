import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/site";

const config: NextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
};

export default config;
