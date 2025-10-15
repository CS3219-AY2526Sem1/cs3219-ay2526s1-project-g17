import { useAuth0 } from "@auth0/auth0-react";

export function useApiToken() {
  const { getAccessTokenSilently, loginWithPopup } = useAuth0();

  async function getToken({ audience, scope }) {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience, scope },
      });
    } catch (e) {
      if (["consent_required", "login_required", "interaction_required"].includes(e.error)) {
        await loginWithPopup({ authorizationParams: { audience, scope } });
        return await getAccessTokenSilently({
          authorizationParams: { audience, scope },
        });
      }
      throw e;
    }
  }

  return { getToken };
}
