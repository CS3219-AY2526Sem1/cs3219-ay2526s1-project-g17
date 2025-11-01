import { auth } from "express-oauth2-jwt-bearer";

export function basicAccessControl(req, res, next) {
  // For now, allow all requests
  next();
}

export const verifyAccessToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  algorithms: ['RS256']
})