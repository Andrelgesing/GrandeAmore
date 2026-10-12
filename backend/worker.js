const mvpOpening = Date.parse('2026-10-11T18:30:00+02:00');
const mvpPoll = '2026-10-11-official';
const mvpCandidates = ["Hay", "Omar", "Daniel", "Paolo (pac)", "Jack", "Takunda", "AlexG", "Samu", "Iacob", "Levi", "Nikita", "Dejan", "davideb", "Andre", "Ali", "Loay", "Andreeas", "Danilo", "Darius", "Enil", "Milan", "Lucas", "gabi", "fabian", "Mohamed", "Baraa", "Valentin", "@Fabien Vjaceslavs"];
const seed = {"AlexG": {"elo": 1200, "legendary": false}, "Andre": {"elo": 1200, "legendary": false}, "Darius": {"elo": 1000, "legendary": false}, "fabian": {"elo": 1000, "legendary": false}, "Enil": {"elo": 1200, "legendary": false}, "gabi": {"elo": 1000, "legendary": false}, "Daniel": {"elo": 1200, "legendary": false}, "Levi": {"elo": 1000, "legendary": false}, "Samu": {"elo": 1000, "legendary": false}, "Dejan": {"elo": 1000, "legendary": false}, "Jack": {"elo": 1000, "legendary": false}, "Ali": {"elo": 1000, "legendary": false}, "Omar": {"elo": 1000, "legendary": false}, "Baraa": {"elo": 1000, "legendary": false}, "Takunda": {"elo": 1000, "legendary": false}, "Danilo": {"elo": 1000, "legendary": false}, "Andreeas": {"elo": 1000, "legendary": false}, "davideb": {"elo": 1000, "legendary": false}, "Nikita": {"elo": 1000, "legendary": false}, "Iacob": {"elo": 1000, "legendary": false}, "Damien": {"elo": 1000, "legendary": false}, "Valentin": {"elo": 1000, "legendary": false}, "Milan": {"elo": 1000, "legendary": false}, "Mohamed": {"elo": 1000, "legendary": false}, "Paolo (pac)": {"elo": 1000, "legendary": false}, "@Fabien Vjaceslavs": {"elo": 1000, "legendary": false}, "Lucas": {"elo": 1200, "legendary": false}, "@~\u2744\ufe0f": {"elo": 1000, "legendary": false}, "Shahrom": {"elo": 1000, "legendary": true}};
seed.Loay = { elo: 1100, legendary: false };
seed.Hay = { elo: 1000, legendary: false };
export default {
 async fetch(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = origin === env.ALLOWED_ORIGIN;
  const headers = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (request.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers });
  if (request.method === 'POST' && !allowed) return new Response('Forbidden', { status: 403 });
  try {
   const id = env.RANKINGS.idFromName('grande-amore');
   const result = await env.RANKINGS.get(id).fetch(request);
   const response = new Response(result.body, result);
   for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
   return response;
  } catch (_) { return Response.json({ error: 'Ratings service unavailable' }, { status: 503, headers }); }
 }
};
export class Rankings {
 constructor(ctx, env) {
  this.ctx = ctx; this.env = env;
  ctx.blockConcurrencyWhile(async () => {
   await ctx.storage.transaction(async tx => {
    const ratings = await tx.get('ratings') || {};
    let changed = false;
    for (const [name, initial] of Object.entries(seed)) {
     if (!Object.hasOwn(ratings, name)) { ratings[name] = { ...initial }; changed = true; }
    }
    if (changed) await tx.put('ratings', ratings);
   });
  });
 }
 async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === '/mvp') return this.mvp(request);
  if (path === '/ratings' && request.method === 'GET') return this.ctx.storage.transaction(async tx => Response.json({ ratings: await tx.get('ratings'), revision: await tx.get('revision') || 0 }));
  if (path !== '/votes' || request.method !== 'POST') return new Response('Not found', { status: 404 });
  let vote;
  try { vote = JSON.parse(await request.text()); } catch (_) { return new Response('Invalid JSON', { status: 400 }); }
  const { winner, loser, id } = vote;
  if (!Object.hasOwn(seed, winner) || !Object.hasOwn(seed, loser) || winner === loser || typeof id !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(id)) return new Response('Invalid vote', { status: 400 });
  return this.ctx.storage.transaction(async tx => {
   const previous = await tx.get('vote:' + id);
   const ratings = await tx.get('ratings');
   if (previous) {
    if (previous.winner !== winner || previous.loser !== loser) return new Response('Conflicting vote', { status: 409 });
    return Response.json({ ratings, revision: await tx.get('revision') || 0 });
   }
   const k = Number(this.env.ELO_K || 16);
   const beforeWinner = ratings[winner].elo, beforeLoser = ratings[loser].elo;
   const points = Math.round(k * (1 - 1 / (1 + 10 ** ((beforeLoser - beforeWinner) / 400))));
   ratings[winner].elo += points; ratings[loser].elo -= points;
   for (const name of [winner, loser]) ratings[name].legendary ||= ratings[name].elo >= 1350;
   const revision = (await tx.get('revision') || 0) + 1;
   await tx.put('revision', revision);
   await tx.put('ratings', ratings);
   await tx.put('vote:' + id, { winner, loser, points, beforeWinner, beforeLoser, k, at: Date.now() });
   return Response.json({ ratings, revision });
  });
 }
 async mvp(request) {
  const voterPattern = /^[a-zA-Z0-9-]{16,80}$/;
  const totalsKey = `mvp:${mvpPoll}:totals`;
  if (request.method === 'GET') {
   const voter = new URL(request.url).searchParams.get('voter');
   if (voter && !voterPattern.test(voter)) return new Response('Invalid voter', { status: 400 });
   return this.ctx.storage.transaction(async tx => Response.json({
    poll: mvpPoll, totals: await tx.get(totalsKey) || {},
    choice: voter ? await tx.get(`mvp:${mvpPoll}:voter:` + voter) || null : null
   }));
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (Date.now() < mvpOpening) return Response.json({ error: 'Voting opens at 18:30 Vienna time' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch (_) { return new Response('Invalid JSON', { status: 400 }); }
  if (!body || typeof body.voter !== 'string' || !voterPattern.test(body.voter) || !mvpCandidates.includes(body.player)) return new Response('Invalid vote', { status: 400 });
  return this.ctx.storage.transaction(async tx => {
   const key = `mvp:${mvpPoll}:voter:` + body.voter;
   const previous = await tx.get(key);
   const totals = await tx.get(totalsKey) || {};
   if (previous) return Response.json({ poll: mvpPoll, totals, choice: previous });
   totals[body.player] = (totals[body.player] || 0) + 1;
   const choice = { player: body.player, at: Date.now() };
   await tx.put(totalsKey, totals);
   await tx.put(key, choice);
   return Response.json({ poll: mvpPoll, totals, choice });
  });
 }

}
