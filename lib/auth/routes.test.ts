import { describe, expect, it } from "vitest";
import { adminRouteDecision, safeAdminNext } from "./routes";

describe("adminRouteDecision (proxy layer)", () => {
  it("no session: every admin path redirects to login, remembering where to return", () => {
    expect(adminRouteDecision("/admin", "", false)).toEqual({ type: "redirect", to: "/admin/login" });
    expect(adminRouteDecision("/admin/menu", "", false)).toEqual({ type: "redirect", to: "/admin/login?next=%2Fadmin%2Fmenu" });
    expect(adminRouteDecision("/admin/settings", "?tab=hours", false)).toEqual({
      type: "redirect",
      to: "/admin/login?next=%2Fadmin%2Fsettings%3Ftab%3Dhours",
    });
  });

  it("login page is always reachable", () => {
    expect(adminRouteDecision("/admin/login", "", false)).toEqual({ type: "allow" });
    expect(adminRouteDecision("/admin/login", "?denied=1", true)).toEqual({ type: "allow" });
  });

  it("with a session the request continues (admin status is checked by the page/action itself)", () => {
    expect(adminRouteDecision("/admin", "", true)).toEqual({ type: "allow" });
  });

  it("look-alike paths are not treated as the login page", () => {
    expect(adminRouteDecision("/admin/loginx", "", false).type).toBe("redirect");
    expect(adminRouteDecision("/admin/login-bypass", "", false).type).toBe("redirect");
  });
});

describe("safeAdminNext (no open redirects)", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/menu", "/admin/menu"],
    ["/admin/settings?tab=hours", "/admin/settings?tab=hours"],
  ])("allows %s", (input, expected) => {
    expect(safeAdminNext(input)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example/admin",
    "//evil.example",
    "/admin//evil.example",
    "/admin/../",
    "/\\evil.example",
    "/menu",
    "/adminx",
    "javascript:alert(1)",
    "/admin/login",
    "/admin/" + "a".repeat(300),
  ])("rejects %j -> /admin", (input) => {
    expect(safeAdminNext(input)).toBe("/admin");
  });
});
