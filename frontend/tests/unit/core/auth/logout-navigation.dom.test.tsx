import { afterEach, beforeEach, expect, rs, test } from "@rstest/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const navigation = rs.hoisted(() => ({ push: rs.fn(), staticMode: false }));
rs.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => "/workspace/chats/new",
}));
rs.mock("@/core/static-mode", () => ({
  isStaticWebsiteOnly: () => navigation.staticMode,
}));

import { AuthProvider, useAuth } from "@/core/auth/AuthProvider";

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Logout</button>;
}

beforeEach(() => {
  navigation.push.mockClear();
  navigation.staticMode = false;
  window.location.href = "http://localhost/workspace/chats/new";
});

afterEach(() => {
  cleanup();
  rs.unstubAllGlobals();
  rs.restoreAllMocks();
});

for (const outcome of ["success", "http-error", "offline", "static"] as const) {
  test(`logout uses a full document navigation (${outcome})`, async () => {
    navigation.staticMode = outcome === "static";
    const fetchMock = rs.fn().mockImplementation(async () => {
      if (outcome === "offline") throw new Error("test gateway unavailable");
      return new Response(null, {
        status: outcome === "http-error" ? 503 : 200,
      });
    });
    rs.stubGlobal("fetch", fetchMock);
    rs.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <AuthProvider initialUser={null}>
        <LogoutButton />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(navigation.push).not.toHaveBeenCalled();
    if (outcome === "static") {
      expect(fetchMock).not.toHaveBeenCalled();
    } else {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    }
  });
}
