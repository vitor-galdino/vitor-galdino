import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const font = w => readFileSync(join(here, 'fonts', `jbm-${w}.woff2`)).toString('base64');

export const profile = {
  name: 'vitor',
  tagline: 'Changing the world one line at a time.',
  groups: [
    { dir: 'skills', label: 'main skills', items: ['react', 'javascript', 'typescript', 'next.js', 'node.js', 'django'] },
    { dir: 'tools', label: 'tools', items: ['vscode', 'git', 'github', 'bash', 'ubuntu', 'wsl', 'windows'] },
    { dir: 'others', label: 'other knowledge', items: ['tailwindcss', 'postgresql', 'sqlite', 'python', 'pandas', 'plotly', 'selenium', 'jupyter', 'figma'] },
  ],
};

const C = { bg: '#0B0A08', bar: '#16130E', border: '#2A2316', amber: '#FFB000', dim: '#8A6A2A', soft: '#FFD27A' };
const FS = 15, CW = FS * 0.6, LH = 24, X0 = 32, W = 920, INNER = W - X0 * 2;
const PROMPT = 'vitor@vtzr:~$ ';
const PX = X0 + PROMPT.length * CW;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => Number(n).toLocaleString('en-US');
const s2 = n => n.toFixed(3) + 's';

let LAND = null;
const land = () => LAND ??= readFileSync(join(here, 'land.txt'), 'utf8').split('\n');
const isLand = (lon, lat) => {
  const r = Math.min(179, Math.max(0, Math.floor(90 - lat)));
  const c = ((Math.floor(lon + 180) % 360) + 360) % 360;
  return land()[r][c] === '1';
};
const landFrac = (lon0, lon1, lat0, lat1) => {
  let n = 0, k = 0;
  for (let lat = lat0; lat > lat1; lat -= 1) for (let lon = lon0; lon < lon1; lon += 1) { k++; if (isLand(lon + 0.5, lat - 0.5)) n++; }
  return k ? n / k : 0;
};

export function subsolar(date) {
  const rad = Math.PI / 180, d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad, dec = Math.asin(Math.sin(e) * Math.sin(L)) / rad;
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  let lon = (ra - gmst * 15) % 360; if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
  return { lat: dec, lon };
}

export function renderTerminal(opts = {}) {
  const {
    stats = { commits: 0, loc: 0 }, groups = profile.groups, heatmap = null, crt = false,
    syncedAt = null, lastCommand = null, world = null, sunAt = null, home = null, since = null, idle = null,
  } = opts;
  let t = crt ? 1.1 : 0.4, y = 78, body = '', uid = 0;
  const cur = [];
  const at = (time, x, yy) => cur.push([time, x, yy]);
  const show = (inner, time) => `<g opacity="0"><set attributeName="opacity" to="1" begin="${s2(time)}" fill="freeze"/>${inner}</g>\n`;

  const command = (cmd, comment = '') => {
    const pad = comment ? ' '.repeat(Math.max(2, 18 - cmd.length)) : '';
    const full = cmd + pad + comment, n = full.length, dur = n * 0.04, id = `k${uid++}`;
    const vals = [], keys = [];
    for (let i = 0; i <= n; i++) { vals.push((i * CW).toFixed(1)); keys.push((i / n).toFixed(4)); }
    const t0 = t + 0.25;
    body += show(
      `<text x="${X0}" y="${y}" class="p">${esc(PROMPT)}</text>` +
      `<clipPath id="${id}"><rect x="${PX}" y="${y - 18}" height="24" width="0"><animate attributeName="width" values="${vals.join(';')}" keyTimes="${keys.join(';')}" calcMode="discrete" begin="${s2(t0)}" dur="${s2(dur)}" fill="freeze"/></rect></clipPath>` +
      `<g clip-path="url(#${id})"><text x="${PX}" y="${y}" class="c">${esc(cmd)}</text>` +
      (comment ? `<text x="${PX + (cmd.length + pad.length) * CW}" y="${y}" class="d">${esc(comment)}</text>` : '') + `</g>`,
      t);
    at(t, PX, y);
    for (let i = 1; i <= n; i++) at(t0 + (i / n) * dur, PX + i * CW, y);
    t = t0 + dur + 0.3;
    y += LH;
    at(t - 0.05, X0, y);
  };
  const output = (txt, cls = 'o') => {
    body += show(`<text x="${X0}" y="${y}" class="${cls}">${esc(txt)}</text>`, t);
    at(t, X0 + txt.length * CW, y);
    t += 0.12; y += LH;
    at(t - 0.02, X0, y);
  };
  const gap = () => { y += LH * 0.55; };

  const statsLine = () => {
    const frames = 32, dur = 1.5, ease = p => 1 - Math.pow(1 - p, 3);
    for (let i = 0; i <= frames; i++) {
      const p = ease(i / frames);
      const parts = [['n', fmt(Math.round(stats.commits * p))], ['o', stats.commits === 1 ? ' commit' : ' commits'], ['d', '  ·  '], ['n', fmt(Math.round(stats.loc * p))], ['o', stats.loc === 1 ? ' line of code' : ' lines of code']];
      const time = t + (i / frames) * dur, len = parts.reduce((a, [, s]) => a + s.length, 0);
      const hide = i === frames ? '' : `<set attributeName="opacity" to="0" begin="${s2(t + ((i + 1) / frames) * dur)}" fill="freeze"/>`;
      body += `<g opacity="0"><set attributeName="opacity" to="1" begin="${s2(time)}" fill="freeze"/>${hide}<text x="${X0}" y="${y}">${parts.map(([c, s]) => `<tspan class="${c}">${esc(s)}</tspan>`).join('')}</text></g>\n`;
      at(time, X0 + len * CW, y);
    }
    t += dur + 0.2; y += LH;
    at(t - 0.05, X0, y);
  };

  const globe = () => {
    const R = 26, gfs = 9, gcw = gfs * 0.6, glh = 9.5, cols = Math.round((R * glh) / gcw);
    const gw = cols * gcw, gh = R * glh, gx = W - X0 - gw, gy = 50;
    const frames = 36, period = 7.2, tilt = 0.4, ramp = '.:-=+*#%@';
    const L = [-0.55, 0.5, 0.67];
    let out = `<defs><radialGradient id="sea" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="${C.amber}" stop-opacity=".16"/><stop offset="1" stop-color="${C.amber}" stop-opacity=".02"/></radialGradient></defs>`;
    out += `<circle cx="${gx + gw / 2}" cy="${gy + gh / 2}" r="${gh / 2 - 2}" fill="url(#sea)" stroke="${C.amber}" stroke-opacity=".18"/>`;
    for (let f = 0; f < frames; f++) {
      const rot = (f / frames) * Math.PI * 2;
      let rows = '';
      for (let r = 0; r < R; r++) {
        let line = '';
        for (let c = 0; c < cols; c++) {
          const nx = ((c + 0.5) / cols) * 2 - 1, ny = 1 - ((r + 0.5) / R) * 2, d = nx * nx + ny * ny;
          if (d > 0.97) { line += ' '; continue; }
          const nz = Math.sqrt(1 - d);
          const y2 = ny * Math.cos(tilt) + nz * Math.sin(tilt), z2 = -ny * Math.sin(tilt) + nz * Math.cos(tilt);
          const lat = Math.asin(y2) * 180 / Math.PI, lon = ((Math.atan2(nx, z2) + rot) * 180 / Math.PI) % 360 - 180;
          if (!isLand(lon, lat)) { line += ' '; continue; }
          const li = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
          line += ramp[Math.min(ramp.length - 1, Math.floor(0.15 * ramp.length + li * ramp.length * 0.9))];
        }
        rows += `<tspan x="${gx}" y="${(gy + glh * (r + 0.8)).toFixed(1)}">${esc(line)}</tspan>`;
      }
      const a = f / frames, b = (f + 1) / frames;
      const anim = f === 0
        ? `<animate attributeName="opacity" values="1;0" keyTimes="0;${b.toFixed(4)}" calcMode="discrete" dur="${period}s" repeatCount="indefinite"/>`
        : `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${a.toFixed(4)};${b.toFixed(4)}" calcMode="discrete" dur="${period}s" repeatCount="indefinite"/>`;
      out += `<text class="g" opacity="${f === 0 ? 1 : 0}">${anim}${rows}</text>`;
    }
    body += show(out, t);
  };

  const printWorld = () => {
    command('./world --render', '# one line at a time');
    const mfs = 10, mcw = mfs * 0.6, cols = Math.floor(INNER / mcw), dlon = 360 / cols, mlh = 10.5;
    const dlat = dlon * (mlh / mcw), top = 78, bottom = -56, ramp = ' .:-=+*#';
    let r = 0;
    for (let lat = top; lat > bottom; lat -= dlat, r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const lon0 = -180 + c * dlon, f = landFrac(Math.floor(lon0), Math.ceil(lon0 + dlon), Math.ceil(lat), Math.floor(lat - dlat));
        line += ramp[Math.min(ramp.length - 1, Math.round(f * (ramp.length - 1)))];
      }
      const yy = y - 12 + r * mlh + mlh * 0.8;
      body += show(`<text x="${X0}" y="${yy.toFixed(1)}" class="w">${esc(line)}</text>`, t);
      at(t, X0 + line.trimEnd().length * mcw, yy);
      t += 0.05;
    }
    y += r * mlh + 2;
    at(t, X0, y);
  };

  const levels = values => {
    const nz = values.filter(v => v > 0).sort((a, b) => a - b);
    const q = p => nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 1;
    const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75);
    return v => (v <= 0 ? 0 : v <= t1 ? 1 : v <= t2 ? 2 : v <= t3 ? 3 : 4);
  };
  const OP = [0.2, 0.55, 0.72, 0.88, 1];

  const heatGrid = () => {
    command('git contributions --last 52w', '# activity');
    const n = heatmap.length, cell = 12.5, step = (INNER - cell) / (n - 1), lvl = levels(heatmap.flat());
    let cells = '';
    heatmap.forEach((week, wi) => week.forEach((v, di) => {
      cells += `<rect x="${(X0 + wi * step).toFixed(1)}" y="${(y - 12 + di * step).toFixed(1)}" width="${cell}" height="${cell}" rx="2.5" fill="${C.amber}" opacity="0"><animate attributeName="opacity" from="0" to="${OP[lvl(v)]}" begin="${s2(t + wi * 0.018)}" dur="0.25s" fill="freeze"/></rect>`;
    }));
    body += cells + '\n';
    y += 7 * step + 4;
    at(t, X0, y);
    t += n * 0.018 + 0.3;
  };

  const heatWorld = () => {
    command('git contributions --last 52w --world', '# a year of code, west → east');
    const days = heatmap.flat(), lvl = levels(days);
    const step = 9, dot = 6, cols = Math.floor(INNER / step) + 1, dlon = 360 / (cols - 1 + 1);
    const top = 78, bottom = -56, rowsN = Math.round((top - bottom) / dlon);
    const pts = [];
    for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
      const lon = -180 + (c + 0.5) * dlon, lat = top - (r + 0.5) * dlon;
      if (landFrac(Math.floor(lon - dlon / 2), Math.ceil(lon + dlon / 2), Math.ceil(lat + dlon / 2), Math.floor(lat - dlon / 2)) >= 0.35) pts.push([c, r]);
    }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let out = '';
    pts.forEach(([c, r], k) => {
      const day = Math.min(days.length - 1, Math.floor((k * days.length) / pts.length));
      const time = t + 0.15 + (c / cols) * 1.8 + (r / rowsN) * 0.25;
      out += `<rect x="${X0 + c * step}" y="${y - 12 + r * step}" width="${dot}" height="${dot}" rx="1.5" fill="${C.amber}" opacity="0"><animate attributeName="opacity" values="0;${OP[lvl(days[day])]}" keySplines="0.25 0.1 0.25 1" calcMode="spline" begin="${s2(time)}" dur="0.9s" fill="freeze"/></rect>`;
    });
    if (sunAt) out += nightOverlay({ x0: X0, y0: y - 12, step, dot, dlon, top, rowsN, cols, begin: t + 2.2 });
    if (home) out += homeMarker({ x0: X0, y0: y - 12, step, dot, dlon, top, begin: t + (sunAt ? 3.0 : 2.2) });
    body += show(out, t);
    y += rowsN * step + 4;
    at(t, X0, y);
    t += (sunAt ? 3.0 : 2.2) + (home ? 1.2 : 0.1);
  };

  function nightOverlay({ x0, y0, step, dot, dlon, top, rowsN, cols, begin }) {
    const sun = subsolar(sunAt), rad = Math.PI / 180;
    const dec = Math.abs(sun.lat) < 0.1 ? 0.1 : sun.lat;
    const X = lon => x0 + ((lon + 180) / dlon - 0.5) * step + dot / 2;
    const Y = lat => y0 + ((top - lat) / dlon - 0.5) * step + dot / 2;
    const mapH = rowsN * step, mapW = cols * step;
    const curve = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sun.lon) * rad) / Math.tan(dec * rad)) / rad;
      curve.push([X(lon), Y(lat)]);
    }
    const edge = dec < 0 ? y0 - 20 : y0 + mapH + 20;
    const pts = curve.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const poly = `${curve[0][0].toFixed(1)},${edge} ${pts} ${curve[curve.length - 1][0].toFixed(1)},${edge}`;
    const fade = to => `<animate attributeName="opacity" values="0;${to}" keySplines="0.25 0.1 0.25 1" calcMode="spline" begin="${s2(begin)}" dur="1.2s" fill="freeze"/>`;
    const sx = X(sun.lon), sy = Y(sun.lat), sunIn = sy > y0 && sy < y0 + mapH;
    const when = sunAt.toISOString().slice(11, 16);
    return `<clipPath id="mapclip"><rect x="${x0 - 4}" y="${y0 - 4}" width="${mapW + 8}" height="${mapH + 8}"/></clipPath>
<g clip-path="url(#mapclip)">
<polygon points="${poly}" fill="#000" opacity="0">${fade(0.45)}</polygon>
<polyline points="${pts}" fill="none" stroke="${C.soft}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0">${fade(0.55)}</polyline>
${sunIn ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="22" fill="url(#sun)" opacity="0">${fade(1)}</circle><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" fill="${C.soft}" opacity="0">${fade(1)}</circle>` : ''}
</g>
<text x="${x0 + mapW - 8}" y="${y0 + mapH - 2}" text-anchor="end" class="t" opacity="0">${fade(1)}day / night at ${when} UTC</text>\n`;
  }

  function homeMarker({ x0, y0, step, dot, dlon, top, begin }) {
    const X = lon => x0 + ((lon + 180) / dlon - 0.5) * step + dot / 2;
    const Y = lat => y0 + ((top - lat) / dlon - 0.5) * step + dot / 2;
    const hx = X(home.lon), hy = Y(home.lat);
    const kx = hx + 10, ky = hy + 12, ex = kx + 7;
    const len = (Math.hypot(kx - hx, ky - hy) - 6 + (ex - kx)).toFixed(1);
    const sx = hx + 4.5, sy = hy + 4.5;
    const local = home.time ? ` · ${home.time}` : '';
    const b = s2(begin), b2 = s2(begin + 0.35);
    return `<g>
<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3.5" fill="${C.soft}" opacity="0"><animate attributeName="opacity" values="0;1" begin="${b}" dur="0.5s" fill="freeze"/></circle>
<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="4" fill="none" stroke="${C.soft}" stroke-width="1.5" opacity="0"><animate attributeName="r" values="4;13" dur="1.8s" begin="${b}" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="1.8s" begin="${b}" repeatCount="indefinite"/></circle>
<polyline points="${sx.toFixed(1)},${sy.toFixed(1)} ${kx.toFixed(1)},${ky.toFixed(1)} ${ex.toFixed(1)},${ky.toFixed(1)}" fill="none" stroke="${C.soft}" stroke-width="1" stroke-opacity=".55" stroke-dasharray="${len}" stroke-dashoffset="${len}"><animate attributeName="stroke-dashoffset" from="${len}" to="0" begin="${b}" dur="0.4s" fill="freeze"/></polyline>
<g opacity="0"><animate attributeName="opacity" values="0;1" keySplines="0.25 0.1 0.25 1" calcMode="spline" begin="${b2}" dur="0.9s" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="-6 0;0 0" keySplines="0.25 0.1 0.25 1" calcMode="spline" begin="${b2}" dur="0.9s" fill="freeze"/>
<rect x="${(ex + 1).toFixed(1)}" y="${(ky - 9).toFixed(1)}" width="${((Math.max(2, (home.label || '').length + local.length)) * 6 + 8).toFixed(1)}" height="31" rx="4" fill="${C.bg}" fill-opacity=".97" stroke="${C.border}"/>
<text x="${(ex + 5).toFixed(1)}" y="${(ky + 4).toFixed(1)}" class="me">me</text>
<text x="${(ex + 5).toFixed(1)}" y="${(ky + 17).toFixed(1)}" class="loc">${esc(home.label || '')}${esc(local)}</text>
</g>
</g>\n`;
  }

  function idleLine(start, ly) {
    const prefix = 'echo "', full = idle.map(p => `${prefix}${p}"`);
    const TYPE = 0.065, DEL = 0.028, BLINK = 0.53, FIRST_HOLD = 2.6, HOLD = 5;
    const mk = () => ({ ev: [], t: 0 });
    const typeTo = (seg, i, from, to) => { for (let n = from; n <= to; n++) { seg.ev.push([seg.t, i, n, 1]); seg.t += TYPE; } };
    const delTo = (seg, i, from, to) => { for (let n = from; n >= to; n--) { seg.ev.push([seg.t, i, n, 1]); seg.t += DEL; } };
    const hold = (seg, i, n, secs) => { let on = 1; for (let k = 0; k < secs; k += BLINK) { seg.ev.push([seg.t, i, n, on]); on ^= 1; seg.t += BLINK; } };
    const P = prefix.length;
    const intro = mk();
    typeTo(intro, 0, 0, full[0].length); hold(intro, 0, full[0].length, FIRST_HOLD); delTo(intro, 0, full[0].length, P);
    const loop = mk();
    typeTo(loop, 1, P, full[1].length); hold(loop, 1, full[1].length, HOLD); delTo(loop, 1, full[1].length, P);
    typeTo(loop, 0, P, full[0].length); hold(loop, 0, full[0].length, HOLD); delTo(loop, 0, full[0].length, P);
    const anim = (seg, attr, fn, begin, repeat) => {
      const kt = seg.ev.map(e => (e[0] / seg.t).toFixed(5));
      return `<animate attributeName="${attr}" values="${seg.ev.map(fn).join(';')}" keyTimes="${kt.join(';')}" calcMode="discrete" begin="${s2(begin)}" dur="${s2(seg.t)}" ${repeat ? 'repeatCount="indefinite"' : 'fill="freeze"'}/>`;
    };
    const both = (attr, fn) => anim(intro, attr, fn, start, false) + anim(loop, attr, fn, start + intro.t, true);
    let out = '';
    full.forEach((txt, i) => {
      const id = `idle${i}`;
      out += `<clipPath id="${id}"><rect x="${PX}" y="${ly - 18}" height="24" width="0">${both('width', e => (e[1] === i ? e[2] * CW : 0).toFixed(1))}</rect></clipPath>`;
      out += `<text x="${PX}" y="${ly}" class="c" clip-path="url(#${id})">${esc(txt)}</text>`;
    });
    out += `<rect width="2.5" height="19" y="${ly - 15}" x="${PX + 2}" fill="${C.amber}" opacity="0">${both('x', e => (PX + e[2] * CW + 2).toFixed(1))}${both('opacity', e => e[3])}</rect>`;
    return out;
  }

  command('whoami');
  output(profile.name, 'name');
  output(`"${profile.tagline}"`, 'd');
  statsLine();
  if (since) {
    const now = sunAt || new Date(), start = new Date(Date.UTC(since, 0, 1));
    const yrs = (now - start) / (365.25 * 86400000), full = Math.floor(yrs);
    const perYear = Math.round(stats.commits / Math.max(yrs, 1) / 10) * 10;
    output(`coding since ${since} · ${full}+ years · ~${fmt(perYear)} commits/year`, 'd');
  }
  if (world === 'globe') globe();

  for (const g of groups) {
    gap();
    command(`ls ${g.dir}/`, `# ${g.label}`);
    output(g.items.join('   '));
  }

  if (world === 'print') { gap(); printWorld(); }

  if (heatmap && heatmap.length) {
    gap();
    world === 'map' ? heatWorld() : heatGrid();
  }

  if (lastCommand) {
    gap();
    command(lastCommand.cmd, `# run by @${lastCommand.user}`);
    for (const l of lastCommand.output) output(l);
  }

  gap();
  body += show(`<text x="${X0}" y="${y}" class="p">${esc(PROMPT)}</text>`, t);
  at(t, PX, y);
  const end = t;
  y += LH;

  cur.sort((a, b) => a[0] - b[0]);
  const T = end + 0.01, t0 = cur[0][0];
  const kt = cur.map(c => ((c[0] - t0) / (T - t0)).toFixed(5));
  kt[0] = '0';
  const cursor = `<rect width="2.5" height="19" fill="${C.amber}" opacity="0" x="${cur[0][1]}" y="${cur[0][2] - 15}">
<set attributeName="opacity" to="1" begin="${s2(t0)}" fill="freeze"/>
<animate attributeName="x" values="${cur.map(c => (c[1] + 2).toFixed(1)).join(';')}" keyTimes="${kt.join(';')}" calcMode="discrete" begin="${s2(t0)}" dur="${s2(T - t0)}" fill="freeze"/>
<animate attributeName="y" values="${cur.map(c => (c[2] - 15).toFixed(1)).join(';')}" keyTimes="${kt.join(';')}" calcMode="discrete" begin="${s2(t0)}" dur="${s2(T - t0)}" fill="freeze"/>
${idle ? `<set attributeName="opacity" to="0" begin="${s2(end + 0.6)}" fill="freeze"/>` : `<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.05s" begin="${s2(end)}" repeatCount="indefinite"/>`}
</rect>${idle ? idleLine(end + 0.6, y - LH) : ''}`;

  const H = Math.round(y - 4);
  const mid = (H + 36) / 2;
  const crtAnim = crt ? `<animateTransform attributeName="transform" type="scale" values="1 0.004;1 0.004;1 1" keyTimes="0;0.35;1" dur="0.9s" fill="freeze"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="vitor@vtzr terminal">
<style>
@font-face { font-family: 'JBM'; font-weight: 400; src: url(data:font/woff2;base64,${font(400)}) format('woff2'); }
@font-face { font-family: 'JBM'; font-weight: 700; src: url(data:font/woff2;base64,${font(700)}) format('woff2'); }
text { font-family: 'JBM', ui-monospace, Menlo, Consolas, monospace; font-size: ${FS}px; white-space: pre; }
.p { fill: ${C.dim}; } .c { fill: ${C.soft}; } .o { fill: ${C.amber}; } .d { fill: ${C.dim}; }
.name { fill: ${C.amber}; font-weight: 700; } .n { fill: ${C.soft}; font-weight: 700; }
.t { fill: ${C.dim}; font-size: 12px; } .g { fill: ${C.amber}; font-size: 9px; } .w { fill: ${C.amber}; font-size: 10px; } .me { fill: ${C.soft}; font-size: 12px; font-weight: 700; } .loc { fill: ${C.dim}; font-size: 10px; }
</style>
<defs>
<radialGradient id="glow" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${C.amber}" stop-opacity=".07"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>
<radialGradient id="sun"><stop offset="0" stop-color="${C.soft}" stop-opacity=".55"/><stop offset="1" stop-color="${C.soft}" stop-opacity="0"/></radialGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".22"/></pattern>
</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${C.bg}" stroke="${C.border}"/>
<path d="M12.5 0.5 H${W - 12.5} A12 12 0 0 1 ${W - 0.5} 12.5 V36 H0.5 V12.5 A12 12 0 0 1 12.5 0.5 Z" fill="${C.bar}"/>
<line x1="0.5" y1="36" x2="${W - 0.5}" y2="36" stroke="${C.border}"/>
<circle cx="22" cy="18" r="5.5" fill="none" stroke="${C.dim}"/><circle cx="40" cy="18" r="5.5" fill="none" stroke="${C.dim}"/><circle cx="58" cy="18" r="5.5" fill="none" stroke="${C.dim}"/>
<text x="${W / 2}" y="22" text-anchor="middle" class="t">vitor@vtzr: ~ — bash</text>
${syncedAt ? `<text x="${W - 20}" y="22" text-anchor="end" class="t">synced ${esc(syncedAt)}</text>` : ''}
<g transform="translate(0 ${mid})"><g>${crtAnim}<g transform="translate(0 ${-mid})">
${crt ? `<rect x="1" y="37" width="${W - 2}" height="${H - 38}" fill="${C.soft}" opacity="0"><animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.4;1" dur="0.9s" fill="freeze"/></rect>` : ''}
${body}
${cursor}
</g></g></g>
<rect x="1" y="37" width="${W - 2}" height="${H - 38}" rx="11" fill="url(#glow)"/>
<rect x="1" y="37" width="${W - 2}" height="${H - 38}" fill="url(#scan)" opacity=".5"/>
</svg>
`;
}
