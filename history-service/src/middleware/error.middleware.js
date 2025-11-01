import { InvalidTokenError, UnauthorizedError, InsufficientScopeError } from "express-oauth2-jwt-bearer";

export const errorHandler = (error, request, response, next) => {
  if (error instanceof InsufficientScopeError) {
    const msg = "Permission denied";

    response.status(error.status).json({msg});

    return;
  }

  if (error instanceof InvalidTokenError) {
    const msg = "Bad credentials";

    response.status(error.status).json({msg});

    return;
  }

  if (error instanceof UnauthorizedError) {
    const message = "requires authentication"

    response.status(error.status).json({message})

    return;
  }

  const defaultFailStatus = 500;
  const defaultFailMessage = "Internal server error";

  response.status(defaultFailStatus).json({defaultFailMessage});
}