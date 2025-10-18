import { configDotenv } from "dotenv";

configDotenv();
export const ENV = process.env.ENV;

export const isDEV = ENV !== "PROD";

export const ACCEPTANCE_TIMEOUT =
  ENV === "PROD" ? Number(process.env.ACCEPTANCE_TIMEOUT) : 1000;

export const REDIS_URL = isDEV
  ? process.env.DEV_REDIS_URL
  : process.env.REDIS_URL;

export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
