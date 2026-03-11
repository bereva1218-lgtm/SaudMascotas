import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";
import * as api from "@/lib/api";

vi.mock("@/lib/api");

describe("AuthContext", () => {
  it("stores user and token after login", async () => {
    const fake = { token: "tok", user: { id: "1", email: "a@b.com", name: "Test", role: "cuidador" } };
    (api.login as unknown as vi.Mock).mockResolvedValue(fake);

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("a@b.com", "pass");
    });

    expect(result.current.user).toEqual(fake.user);
    expect(result.current.token).toEqual(fake.token);
  });
});
