const configuredApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();

export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, "")
  : import.meta.env.DEV
    ? ""
    : undefined;

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (API_BASE_URL === undefined) {
    throw new Error(
      "VITE_API_BASE_URL must be set to the Render API URL in production.",
    );
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = apiUrl(path);
  try {
    const response = await fetch(url, init);
    if (response.status >= 500) {
      console.error("[API] Backend server error", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }
    return response;
  } catch (error) {
    console.error("[API] Network request failed", {
      url,
      error,
      hint: "Check Render availability and CORS configuration; browsers may report CORS blocks as network errors.",
    });
    throw error;
  }
}
