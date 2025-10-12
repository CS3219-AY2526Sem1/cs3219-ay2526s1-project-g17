import { configDotenv } from "dotenv";

configDotenv();
export const ENV = process.env.ENV;
export const ACCEPTANCE_TIMEOUT =
  ENV === "PROD" ? Number(process.env.ACCEPTANCE_TIMEOUT) : 1000;
