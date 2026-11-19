import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const hash = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
};
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};
const code = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
};
async function participant(room: string, rawToken: string) {
  if (!room || !rawToken) throw new Error("Missing room or participant token.");
  const { data: roomRow, error: roomError } = await supabase.from("couple_rooms").select("id,room_code").eq("room_code", room).single();
  if (roomError || !roomRow) throw new Error("Couple room not found.");
  const { data: p, error } = await supabase.from("couple_participants").select("id,role,submitted_at,token_hash").eq("room_id", roomRow.id).eq("token_hash", await hash(rawToken)).single();
  if (error || !p) throw new Error("This device is not authorised for that room. Open your original invitation link.");
  return { roomRow, p };
}
function validAnswers(a: unknown): a is number[] {
  return Array.isArray(a) && a.length === 30 && a.every(v => Number.isInteger(v) && v >= 1 && v <= 5);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const body = await req.json();
    const action = body.action;
    if (action === "create_room") {
      let roomCode = code();
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase.from("couple_rooms").select("id").eq("room_code", roomCode).maybeSingle();
        if (!existing) break;
        roomCode = code();
      }
      const { data: room, error: re } = await supabase.from("couple_rooms").insert({ room_code: roomCode }).select().single();
      if (re) throw re;
      const raw = token();
      const { error: pe } = await supabase.from("couple_participants").insert([
        { room_id: room.id, role: "suresh", display_name: "Suresh", token_hash: await hash(raw) },
        { room_id: room.id, role: "tanu", display_name: "Tanu", token_hash: null },
      ]);
      if (pe) throw pe;
      const base = req.headers.get("origin") || "";
      return json({ room: roomCode, token: raw, invite_url: `${base}/?room=${roomCode}&join=tanu` });
    }
    if (action === "join_room") {
      const roomCode = String(body.room || "").toUpperCase();
      const { data: room, error: re } = await supabase.from("couple_rooms").select("id").eq("room_code", roomCode).single();
      if (re || !room) return fail("That invitation room could not be found.");
      const { data: tanu, error: te } = await supabase.from("couple_participants").select("id,token_hash").eq("room_id", room.id).eq("role", "tanu").maybeSingle();
      if (te) throw te;
      if (tanu?.token_hash) return fail("Tanu's place in this room has already been claimed. Ask Suresh for the original device/session.", 409);
      const raw = token();
      const { error: ue } = await supabase.from("couple_participants").update({ token_hash: await hash(raw) }).eq("id", tanu.id);
      if (ue) throw ue;
      return json({ token: raw });
    }
    const { roomRow, p } = await participant(String(body.room || "").toUpperCase(), String(body.token || ""));
    if (action === "save_answers" || action === "submit_answers") {
      if (p.submitted_at) return fail("Your answers have already been submitted and locked.");
      if (!validAnswers(body.answers)) return fail("Please answer all 30 questions using a rating from 1 to 5.");
      const { error: ae } = await supabase.from("couple_answers").upsert({ participant_id: p.id, answers: body.answers, updated_at: new Date().toISOString() });
      if (ae) throw ae;
      if (action === "submit_answers") {
        const { error: se } = await supabase.from("couple_participants").update({ submitted_at: new Date().toISOString() }).eq("id", p.id).is("submitted_at", null);
        if (se) throw se;
      }
      return json({ ok: true });
    }
    if (action === "get_my_answers") {
      const { data: saved, error: ae } = await supabase.from("couple_answers").select("answers").eq("participant_id", p.id).maybeSingle();
      if (ae) throw ae;
      return json({ answers: validAnswers(saved?.answers) ? saved.answers : Array(30).fill(0) });
    }
    if (action === "status") {
      const { data: people, error: pe } = await supabase.from("couple_participants").select("role,submitted_at").eq("room_id", roomRow.id);
      if (pe) throw pe;
      const s = people.find(x => x.role === "suresh");
      const t = people.find(x => x.role === "tanu");
      return json({ me_submitted: !!p.submitted_at, suresh_submitted: !!s?.submitted_at, tanu_submitted: !!t?.submitted_at, both_submitted: !!s?.submitted_at && !!t?.submitted_at });
    }
    if (action === "results") {
      const { data: people, error: pe } = await supabase.from("couple_participants").select("id,role,submitted_at").eq("room_id", roomRow.id);
      if (pe) throw pe;
      if (people.length !== 2 || people.some(x => !x.submitted_at)) return fail("The report unlocks after both participants submit.", 403);
      const { data: rows, error: ae } = await supabase.from("couple_answers").select("participant_id,answers").in("participant_id", people.map(x => x.id));
      if (ae) throw ae;
      const s = people.find(x => x.role === "suresh");
      const t = people.find(x => x.role === "tanu");
      const sa = rows.find(x => x.participant_id === s.id)?.answers;
      const ta = rows.find(x => x.participant_id === t.id)?.answers;
      if (!validAnswers(sa) || !validAnswers(ta)) return fail("Submitted answers are incomplete. Contact the room creator.");
      return json({ suresh_answers: sa, tanu_answers: ta });
    }
    return fail("Unknown action.");
  } catch (e) {
    return fail(e?.message || "Unexpected server error.", 500);
  }
});
