/* The coverage figure on the home page.
 *
 * Builds every <div class="cov" data-src="..."> from the JSON that
 * plugrl-server's figures/coverage/data.py writes. Each cell shows a still;
 * its clip loads on first use and plays on hover (mouse) or on tap / Enter.
 * With reduced motion requested, hovering plays nothing.
 */
(function () {
  "use strict";

  const EXPERIMENTS = "https://github.com/PlugRL/plugrl-server/tree/main/experiments/";

  const TEXT = {
    en: {
      status: {
        learns: "learns",
        rising: "runs · rising",
        flat: "runs · no learning",
        runs: "runs end to end",
        collapses: "runs · collapses",
        holds: "runs · intact",
        reference: "as released",
      },
      legend: {
        learns: "learned the task",
        rising: "runs, return still rising",
        flat: "runs, has not learned",
        collapses: "runs, one iteration breaks it",
      },
      play: "▶",
      speed: (s) => `${s}× speed`,
      clip: (m) =>
        `Episode ${m.episode} of ${m.of}: the median return (${m.return}). ` +
        `All returns: ${m.returns.join(", ")}.`,
      vlaClip: (m) => `This episode ${m.success ? "succeeds" : "fails"}.`,
      of: "of",
      successes: "successes in 50 episodes",
      missing: "clip not recorded",
    },
    zh: {
      status: {
        learns: "学会",
        rising: "跑通 · 在上升",
        flat: "跑通 · 没学会",
        runs: "端到端跑通",
        collapses: "跑通 · 归零",
        holds: "跑通 · 没被毁",
        reference: "原版",
      },
      legend: {
        learns: "学会了任务",
        rising: "跑通，回报还在上升",
        flat: "跑通，还没学会",
        collapses: "跑通，一轮训练就把它毁了",
      },
      play: "▶",
      speed: (s) => `${s} 倍速`,
      clip: (m) =>
        `第 ${m.episode} 个回合（共 ${m.of} 个），回报取中位数（${m.return}）。` +
        `全部回报：${m.returns.join("、")}。`,
      vlaClip: (m) => `视频里这个回合${m.success ? "成功了" : "失败了"}。`,
      of: "/",
      successes: "50 个回合里的成功次数",
      missing: "没有录像",
    },
  };

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids) if (kid) node.append(kid);
    return node;
  }

  function svg(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function fmtSpeed(s) {
    return s >= 1 ? s.toFixed(1) : s < 0.1 ? s.toFixed(2) : s.toFixed(1);
  }

  // Every seed thin, their mean thick, on the task's shared vertical range.
  function spark(curves, range) {
    const [lo, hi] = range;
    const seeds = curves.filter((c) => c.length > 1);
    const box = svg("svg", { class: "cov-spark", viewBox: "0 0 100 30", preserveAspectRatio: "none", "aria-hidden": "true" });
    if (!seeds.length) return box;
    const y = (v) => (28 - ((v - lo) / (hi - lo)) * 26 + 1).toFixed(2);
    const line = (values, cls) => {
      const n = values.length;
      const pts = values.map((v, i) => `${((i / (n - 1)) * 100).toFixed(2)},${y(v)}`).join(" ");
      box.append(svg("polyline", { points: pts, class: cls }));
    };
    seeds.forEach((s) => line(s, "seed"));
    const n = Math.min(...seeds.map((s) => s.length));
    const mean = Array.from({ length: n }, (_, i) => seeds.reduce((a, s) => a + s[i], 0) / seeds.length);
    line(mean, "mean");
    return box;
  }

  const players = [];

  function media(id, clip, base, t, describe) {
    const box = el("div", { class: "cov-media" });
    if (!clip) {
      box.append(el("span", { class: "cov-play", text: t.missing }));
      return { box, wire: () => {} };
    }
    const img = el("img", { src: `${base}/${id}.jpg`, alt: "", loading: "lazy", width: 256, height: 256 });
    const video = el("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true" });
    video.muted = true;
    box.append(img, video, el("span", { class: "cov-play", text: t.play }));
    if (Math.abs(clip.speed - 1) > 0.1) {
      box.append(el("span", { class: "cov-speed", text: t.speed(fmtSpeed(clip.speed)) }));
    }
    const wire = (cell) => {
      cell.title = describe(clip);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      const play = () => {
        players.forEach((p) => p !== stop && p());
        if (!video.src) video.src = `${base}/${id}.mp4`;
        video.play().then(() => cell.classList.add("is-playing")).catch(() => {});
      };
      const stop = () => {
        video.pause();
        cell.classList.remove("is-playing");
      };
      players.push(stop);
      const toggle = () => (cell.classList.contains("is-playing") ? stop() : play());
      cell.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && !reduce.matches && play());
      cell.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && stop());
      cell.addEventListener("click", (e) => !e.target.closest("a") && toggle());
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    };
    return { box, wire };
  }

  function links(ids, dirs) {
    const p = el("div", { class: "cov-links" });
    ids.forEach((e) => p.append(el("a", { href: EXPERIMENTS + dirs[e], text: e })));
    return p;
  }

  function cell(c, data, base, t, zh) {
    const node = el("figure", { class: "cov-cell", "data-status": c.status, tabindex: 0 });
    const m = media(c.id, c.clip, base, t, t.clip);
    m.box.append(el("span", { class: "cov-chip", text: t.status[c.status] }));
    node.append(
      m.box,
      el("figcaption", { class: "cov-body" },
        spark(c.curves, data.ranges[c.column]),
        el("div", { class: "cov-note", text: zh ? c.note_zh : c.note }),
        links(c.experiments, data.experiments)),
    );
    m.wire(node);
    return node;
  }

  function vlaCell(c, data, base, t, zh) {
    const node = el("figure", { class: "cov-cell", "data-status": c.status, tabindex: 0 });
    const m = media(c.id, c.clip, base, t, t.vlaClip);
    m.box.append(el("span", { class: "cov-chip", text: t.status[c.status] }));
    const [k, n] = c.score;
    const bar = el("div", { class: "cov-bar", title: t.successes }, el("span", { style: `width:${(100 * k) / n}%` }));
    node.append(
      m.box,
      el("figcaption", { class: "cov-body" },
        el("div", { class: "cov-vla-label", text: zh ? c.label_zh : c.label }),
        el("div", { class: "cov-score", title: t.successes },
          el("strong", { text: String(k) }), el("span", { text: `${t.of} ${n}` })),
        bar,
        el("div", { class: "cov-note", text: zh ? c.note_zh : c.note }),
        links(c.experiments, data.experiments)),
    );
    m.wire(node);
    return node;
  }

  function build(root, data) {
    const zh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
    const t = zh ? TEXT.zh : TEXT.en;
    const base = root.dataset.src.replace(/\/[^/]*$/, "");

    const grid = el("div", { class: "cov-grid" });
    data.columns.forEach((col) => grid.append(el("div", { class: "cov-colhead", text: col.label })));
    data.rows.forEach((row) => {
      grid.append(el("div", { class: "cov-rowhead", text: row.label }));
      data.columns.forEach((col) => {
        const c = data.cells.find((x) => x.row === row.id && x.column === col.id);
        grid.append(c ? cell(c, data, base, t, zh) : el("div"));
      });
    });
    root.append(el("div", { class: "cov-scroll" }, grid));

    const legend = el("p", { class: "cov-legend" });
    Object.entries(t.legend).forEach(([s, label]) => legend.append(el("span", { "data-status": s, text: label })));
    root.append(legend);

    if (data.vla) {
      const row = el("div", { class: "cov-vla-grid" });
      data.vla.cells.forEach((c) => row.append(vlaCell(c, data, base, t, zh)));
      root.append(
        el("div", { class: "cov-vla" },
          el("p", { class: "cov-vla-title", text: zh ? data.vla.task_zh : data.vla.task }),
          el("div", { class: "cov-scroll" }, row)),
      );
    }
  }

  function init() {
    document.querySelectorAll(".cov[data-src]").forEach((root) => {
      if (root.dataset.built) return;
      root.dataset.built = "1";
      fetch(root.dataset.src)
        .then((r) => r.json())
        .then((data) => build(root, data))
        .catch(() => {
          root.textContent = "";
        });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
