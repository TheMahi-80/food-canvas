import { describe, expect, it } from "vitest";
import { checkAdmin, type AdminCheckClient } from "./check";

function fakeClient(opts: {
  user?: { id: string; email?: string | null } | null;
  userError?: unknown;
  userThrows?: boolean;
  isAdmin?: boolean | null;
  rpcError?: unknown;
  rpcThrows?: boolean;
}): AdminCheckClient & { rpcCalls: number } {
  const client = {
    rpcCalls: 0,
    auth: {
      getUser: async () => {
        if (opts.userThrows) throw new Error("network");
        return { data: { user: opts.user ?? null }, error: opts.userError ?? null };
      },
    },
    rpc: async () => {
      client.rpcCalls++;
      if (opts.rpcThrows) throw new Error("network");
      return { data: opts.isAdmin ?? null, error: opts.rpcError ?? null };
    },
  };
  return client;
}

describe("checkAdmin (used by every admin page and mutation)", () => {
  it("no session -> unauthenticated, and the database is not even asked", async () => {
    const client = fakeClient({ user: null });
    expect(await checkAdmin(client)).toEqual({ status: "unauthenticated" });
    expect(client.rpcCalls).toBe(0);
  });

  it("invalid/expired session (auth server error) -> unauthenticated", async () => {
    expect(await checkAdmin(fakeClient({ user: { id: "u1" }, userError: { message: "invalid JWT" } }))).toEqual({ status: "unauthenticated" });
    expect(await checkAdmin(fakeClient({ userThrows: true }))).toEqual({ status: "unauthenticated" });
  });

  it("signed-in non-admin -> forbidden", async () => {
    expect(await checkAdmin(fakeClient({ user: { id: "u2", email: "x@example.com" }, isAdmin: false }))).toEqual({
      status: "forbidden",
      email: "x@example.com",
    });
  });

  it("fails closed when the admin lookup errors, throws or returns anything but true", async () => {
    for (const opts of [{ rpcError: { code: "500" } }, { rpcThrows: true }, { isAdmin: null }, { isAdmin: "true" as unknown as boolean }]) {
      const result = await checkAdmin(fakeClient({ user: { id: "u3" }, ...opts }));
      expect(result.status).toBe("forbidden");
    }
  });

  it("admin -> admin with id and email", async () => {
    expect(await checkAdmin(fakeClient({ user: { id: "a1", email: "owner@example.com" }, isAdmin: true }))).toEqual({
      status: "admin",
      user: { id: "a1", email: "owner@example.com" },
    });
  });
});
