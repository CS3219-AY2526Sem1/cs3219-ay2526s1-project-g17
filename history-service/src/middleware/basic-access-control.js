import "../config/env.js";
import { auth } from "express-oauth2-jwt-bearer";

export const verifyAccessToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  algorithms: ['RS256']
})
