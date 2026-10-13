const tournamentKey = 'tournament:2026-10-11:placement';
const tournamentChanges = {"Hay": -20, "Omar": -20, "Daniel": -20, "Paolo (pac)": -20, "Jack": -20, "Takunda": -20, "AlexG": -20, "Samu": -40, "Iacob": -40, "Levi": -40, "Nikita": -40, "Dejan": -40, "davideb": -40, "Andre": -40, "Ali": 40, "Loay": 40, "Andreeas": 40, "Danilo": 40, "Darius": 40, "Enil": 40, "Milan": 40, "Lucas": 20, "gabi": 20, "fabian": 20, "Mohamed": 20, "Baraa": 20, "Valentin": 20, "@Fabien Vjaceslavs": 20};
const mvpOpening = Date.parse('2026-10-11T18:30:00+02:00');
const mvpPoll = '2026-10-11-official';
const mvpCandidates = ["Hay", "Omar", "Daniel", "Paolo (pac)", "Jack", "Takunda", "AlexG", "Samu", "Iacob", "Levi", "Nikita", "Dejan", "davideb", "Andre", "Ali", "Loay", "Andreeas", "Danilo", "Darius", "Enil", "Milan", "Lucas", "gabi", "fabian", "Mohamed", "Baraa", "Valentin", "@Fabien Vjaceslavs"];
const seed = {"AlexG": {"elo": 1200, "legendary": false}, "Andre": {"elo": 1200, "legendary": false}, "Darius": {"elo": 1000, "legendary": false}, "fabian": {"elo": 1000, "legendary": false}, "Enil": {"elo": 1200, "legendary": false}, "gabi": {"elo": 1000, "legendary": false}, "Daniel": {"elo": 1200, "legendary": false}, "Levi": {"elo": 1000, "legendary": false}, "Samu": {"elo": 1000, "legendary": false}, "Dejan": {"elo": 1000, "legendary": false}, "Jack": {"elo": 1000, "legendary": false}, "Ali": {"elo": 1000, "legendary": false}, "Omar": {"elo": 1000, "legendary": false}, "Baraa": {"elo": 1000, "legendary": false}, "Takunda": {"elo": 1000, "legendary": false}, "Danilo": {"elo": 1000, "legendary": false}, "Andreeas": {"elo": 1000, "legendary": false}, "davideb": {"elo": 1000, "legendary": false}, "Nikita": {"elo": 1000, "legendary": false}, "Iacob": {"elo": 1000, "legendary": false}, "Damien": {"elo": 1000, "legendary": false}, "Valentin": {"elo": 1000, "legendary": false}, "Milan": {"elo": 1000, "legendary": false}, "Mohamed": {"elo": 1000, "legendary": false}, "Paolo (pac)": {"elo": 1000, "legendary": false}, "@Fabien Vjaceslavs": {"elo": 1000, "legendary": false}, "Lucas": {"elo": 1200, "legendary": false}, "@~\u2744\ufe0f": {"elo": 1000, "legendary": false}, "Shahrom": {"elo": 1000, "legendary": true}};
seed.Loay = { elo: 1100, legendary: false };
seed.Hay = { elo: 1000, legendary: false };
seed.Giorgios = { elo: 1100, legendary: true };
const duelEligible = name => Object.hasOwn(seed, name) && name !== '@~❄️';
export const calibrationK = (rating, baseK = 16) => (rating.calibrationDuels ?? 10) < 3 ? 64 : (rating.calibrationDuels ?? 10) < 10 ? 32 : baseK;
const calibrationMigration = 'elo-calibration:v1';
const archivePrefix = 'elo-snapshot:';
const archiveBaseline = 'elo-archive-baseline';
export function viennaDate(timestamp) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
 }).formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
 return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
async function snapshot(tx, scheduledAt = null) {
 const capturedAt = new Date().toISOString();
 return {
  schemaVersion: 1, timezone: 'Europe/Vienna', capturedAt,
  date: viennaDate(scheduledAt ?? Date.now()).date,
  scheduledAt: scheduledAt === null ? null : new Date(scheduledAt).toISOString(),
  revision: await tx.get('revision') || 0,
  ratings: await tx.get('ratings'),
  tournamentAdjustments: (await tx.get(tournamentKey))?.adjustments || {}
 };
}
function archiveResponse(data, format, filename) {
 const headers = { 'Content-Disposition': `attachment; filename="${filename}.${format}"` };
 if (format === 'csv') {
  const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
  const snapshots = Array.isArray(data.snapshots) ? [data.baseline, ...data.snapshots].filter(Boolean) : [data];
  const rows = [['date', 'captured_at', 'scheduled_at', 'revision', 'player', 'elo', 'legendary', 'tournament_adjustment']];
  for (const item of snapshots) for (const [name, rating] of Object.entries(item.ratings)) {
   rows.push([item.date, item.capturedAt, item.scheduledAt || '', item.revision, name, rating.elo, rating.legendary, item.tournamentAdjustments[name] || 0]);
  }
  return new Response(rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n', { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
 }
 return Response.json(data, { headers });
}
export default {
 async scheduled(controller, env) {
  if (viennaDate(controller.scheduledTime).time !== '23:55') return;
  const id = env.RANKINGS.idFromName('grande-amore');
  const response = await env.RANKINGS.get(id).fetch(new Request('https://internal/internal/elo-snapshot', {
   method: 'POST', body: JSON.stringify({ scheduledAt: controller.scheduledTime })
  }));
  if (!response.ok) throw new Error(`Daily Elo export failed: ${response.status}`);
  console.log(JSON.stringify({ event: 'daily-elo-export', date: viennaDate(controller.scheduledTime).date }));
 },
 async fetch(request, env) {
  if (new URL(request.url).pathname.startsWith('/internal/')) return new Response('Not found', { status: 404 });
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
    const calibrationEnabled = await tx.get(calibrationMigration);
    let changed = false;
    for (const [name, initial] of Object.entries(seed)) {
     if (!Object.hasOwn(ratings, name)) { ratings[name] = { ...initial, ...(calibrationEnabled ? { calibrationDuels: 0 } : {}) }; changed = true; }
    }
    if (env.APPLY_TOURNAMENT_20261011 === 'true' && !await tx.get(tournamentKey)) {
     const beforeRevision = await tx.get('revision') || 0;
     const beforeRatings = structuredClone(ratings);
     for (const [name, delta] of Object.entries(tournamentChanges)) {
      ratings[name].elo += delta;
      ratings[name].legendary ||= ratings[name].elo >= 1350;
     }
     await tx.put(tournamentKey, { adjustments: tournamentChanges, beforeRatings, afterRatings: structuredClone(ratings), beforeRevision, revision: beforeRevision + 1, at: Date.now() });
     await tx.put('revision', beforeRevision + 1);
     changed = true;
    }
    if (changed) await tx.put('ratings', ratings);
    if (!calibrationEnabled) await tx.put(calibrationMigration, true);
    if (!await tx.get(archiveBaseline)) await tx.put(archiveBaseline, await snapshot(tx));
   });
  });
 }
 async fetch(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/internal/elo-snapshot' && request.method === 'POST') {
   const { scheduledAt } = await request.json();
   if (!Number.isFinite(scheduledAt) || viennaDate(scheduledAt).time !== '23:55') return new Response('Invalid schedule', { status: 400 });
   return this.ctx.storage.transaction(async tx => {
    const key = archivePrefix + viennaDate(scheduledAt).date;
    let saved = await tx.get(key);
    if (!saved) { saved = await snapshot(tx, scheduledAt); await tx.put(key, saved); }
    return Response.json(saved);
   });
  }
  if (path === '/elo-history' && request.method === 'GET') {
   const format = url.searchParams.get('format') || 'json';
   const date = url.searchParams.get('date');
   const after = url.searchParams.get('after');
   if (!['json', 'csv'].includes(format) || [date, after].some(value => value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value))) return new Response('Invalid archive query', { status: 400 });
   if (date) {
    const saved = await this.ctx.storage.get(archivePrefix + date);
    return saved ? archiveResponse(saved, format, `grande-amore-elo-${date}`) : new Response('Snapshot not found', { status: 404 });
   }
   const entries = await this.ctx.storage.list({ prefix: archivePrefix, limit: 366, ...(after ? { startAfter: archivePrefix + after } : {}) });
   const snapshots = [...entries.values()];
   return archiveResponse({ schemaVersion: 1, timezone: 'Europe/Vienna', scheduledTime: '23:55',
    baseline: after ? null : await this.ctx.storage.get(archiveBaseline), snapshots,
    nextAfter: snapshots.length === 366 ? snapshots.at(-1).date : null
   }, format, 'grande-amore-elo-history');
  }
  if (path === '/tournament-placement' && request.method === 'GET') return Response.json(await this.ctx.storage.get(tournamentKey) || null);
  if (path === '/mvp') return this.mvp(request);
  if (path === '/ratings' && request.method === 'GET') return this.ctx.storage.transaction(async tx => Response.json({ ratings: await tx.get('ratings'), revision: await tx.get('revision') || 0, tournamentAdjustments: (await tx.get(tournamentKey))?.adjustments || {} }));
  if (path !== '/votes' || request.method !== 'POST') return new Response('Not found', { status: 404 });
  let vote;
  try { vote = JSON.parse(await request.text()); } catch (_) { return new Response('Invalid JSON', { status: 400 }); }
  const { winner, loser, id } = vote;
  if (!duelEligible(winner) || !duelEligible(loser) || winner === loser || typeof id !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(id)) return new Response('Invalid vote', { status: 400 });
  return this.ctx.storage.transaction(async tx => {
   const previous = await tx.get('vote:' + id);
   const ratings = await tx.get('ratings');
   if (previous) {
    if (previous.winner !== winner || previous.loser !== loser) return new Response('Conflicting vote', { status: 409 });
    return Response.json({ ratings, revision: await tx.get('revision') || 0 });
   }
   const k = Number(this.env.ELO_K || 16);
   const beforeWinner = ratings[winner].elo, beforeLoser = ratings[loser].elo;
   const winnerK = calibrationK(ratings[winner], k), loserK = calibrationK(ratings[loser], k);
   const upset = 1 - 1 / (1 + 10 ** ((beforeLoser - beforeWinner) / 400));
   const winnerPoints = Math.round(winnerK * upset), loserPoints = Math.round(loserK * upset);
   const beforeWinnerCalibration = ratings[winner].calibrationDuels ?? 10;
   const beforeLoserCalibration = ratings[loser].calibrationDuels ?? 10;
   ratings[winner].elo += winnerPoints; ratings[loser].elo -= loserPoints;
   for (const name of [winner, loser]) {
    if ((ratings[name].calibrationDuels ?? 10) < 10) ratings[name].calibrationDuels++;
   }
   for (const name of [winner, loser]) ratings[name].legendary ||= ratings[name].elo >= 1350;
   const revision = (await tx.get('revision') || 0) + 1;
   await tx.put('revision', revision);
   await tx.put('ratings', ratings);
   await tx.put('vote:' + id, { winner, loser, points: winnerPoints, winnerPoints, loserPoints, beforeWinner, beforeLoser, k, winnerK, loserK, beforeWinnerCalibration, beforeLoserCalibration, at: Date.now() });
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
