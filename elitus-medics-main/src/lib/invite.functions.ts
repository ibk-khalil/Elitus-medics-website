import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Validates an invite code against the INVITE_CODE secret.
 * Returns { ok: boolean } — never reveals the actual code.
 */
export const validateInviteCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.INVITE_CODE;
    if (!expected) {
      return { ok: false, reason: "Invite code not configured. Contact admin." };
    }
    const ok = data.code.trim().toLowerCase() === expected.trim().toLowerCase();
    return { ok, reason: ok ? null : "Invalid invite code." };
  });
