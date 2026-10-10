import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import {
  ALLIES,
  STEP,
  allyCost,
  allySlots,
  buyAlly,
  buyBlocker,
  buyGuard,
  buyScythe,
  guardCost,
  scytheCost,
  chooseUpgrade,
  createGame,
  isBetter,
  nextSlotLevel,
  shieldHealth,
  shieldCapacity,
  step,
  evolutionStage,
  isBreather,
  formatTime,
} from "../../lib/game.mjs";
import { SPRITE_URLS, drawGame, readPalette } from "./draw.mjs";
import { useGameInput } from "./useGameInput.js";
import { createGameAudio } from "./audio.mjs";
import { createRenderCache } from "./render-cache.mjs";
import {
  GameHud,
  LevelUpCard,
  OverCard,
  PauseCard,
  ShopCard,
  StartCard,
} from "./GameHud.jsx";

// Kept out of IndexedDB on purpose: the game is independent of app data and
// must not touch the backup schema.
const BEST_KEY = "tranaya-game-best";

function loadBest() {
  try {
    const best = JSON.parse(localStorage.getItem(BEST_KEY));
    return Number.isFinite(best?.time) && Number.isFinite(best?.kills)
      ? best
      : null;
  } catch {
    return null;
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Storage may be blocked (private mode); the record just isn't kept.
  }
}

const snapshot = (s) => ({
  phase: evolutionStage(s.time),
  breather: isBreather(s.time),
  bossIn: Math.max(0, s.nextBoss - s.time),
  power: Math.round((s.stats.power - 1) * 100),
  laser: s.stats.laser,
  hp: s.player.hp,
  maxHp: s.player.maxHp,
  shield: shieldHealth(s),
  shieldMax: shieldCapacity(s),
  level: s.level,
  xp: s.xp,
  xpNext: s.xpNext,
  time: s.time,
  kills: s.kills,
  coins: s.coins,
  allies: s.allies.length,
  slots: allySlots(s.level),
  guards: s.guards,
  scythes: s.scythes,
  scythesReady: s.scytheReady.filter((t) => t <= s.time).length,
});
const levelUpOf = (s) => ({
  level: s.level,
  choices: s.pending,
  upgrades: { ...s.upgrades },
  slotUnlocked: allySlots(s.level) > allySlots(s.level - 1),
});
const shopOf = (s) => ({
  coins: s.coins,
  used: s.allies.length,
  slots: allySlots(s.level),
  nextLevel: nextSlotLevel(s.level),
  items: Object.keys(ALLIES).map((kind) => ({
    kind,
    cost: allyCost(s, kind),
    blocker: buyBlocker(s, kind),
    owned: s.allies.filter((a) => a.kind === kind).length,
  })),
  guard: {
    cost: guardCost(s),
    owned: s.guards,
    blocker: s.coins < guardCost(s) ? "coins" : null,
  },
  scythe: {
    cost: scytheCost(s),
    owned: s.scythes,
    blocker: s.coins < scytheCost(s) ? "coins" : null,
  },
});
const SHOP_KEYS = [...Object.keys(ALLIES), "guard", "scythe"];

export function Game() {
  const stageRef = useRef(null),
    canvasRef = useRef(null),
    gameRef = useRef(null),
    viewRef = useRef({ w: 0, h: 0, dpr: 1 }),
    paletteRef = useRef(null),
    spritesRef = useRef({}),
    audioRef = useRef(null),
    [soundEnabled, setSoundEnabled] = useState(true),
    [screen, setScreen] = useState("start"),
    [hud, setHud] = useState(null),
    [levelUp, setLevelUp] = useState(null),
    [shop, setShop] = useState(null),
    [result, setResult] = useState(null),
    [best, setBest] = useState(loadBest);
  const input = useGameInput(canvasRef, screen === "playing");
  const renderCacheRef = useRef(null);
  const reducedMotionRef = useRef(false);
  const contextRef = useRef(null);
  const resolutionRef = useRef(2);
  useEffect(
    () => () => {
      const cache = renderCacheRef.current;
      if (cache) {
        for (const collection of [cache.dragons, cache.lasers]) {
          for (const image of collection.values()) image.close?.();
        }
      }
      renderCacheRef.current = null;
    },
    [],
  );
  useEffect(() => {
    if (screen === "playing")
      document.documentElement.dataset.gameActive = "true";
    else delete document.documentElement.dataset.gameActive;
    return () => {
      delete document.documentElement.dataset.gameActive;
    };
  }, [screen]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const audio = createGameAudio();
    audioRef.current = audio;
    return () => audio.dispose();
  }, []);
  useEffect(() => {
    audioRef.current?.setPlaying(screen === "playing");
  }, [screen]);
  const toggleSound = () => {
    const enabled = !soundEnabled;
    setSoundEnabled(enabled);
    audioRef.current?.setEnabled(enabled);
    if (enabled) audioRef.current?.unlock();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const view = viewRef.current;
    if (!canvas || !view.w) return;
    const g = (contextRef.current ||= canvas.getContext("2d", {
      alpha: false,
    }));
    if (!g) return;
    paletteRef.current ||= readPalette(canvas);
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawGame(g, paletteRef.current, gameRef.current, view, {
      pointer: input.pointer,
      sprites: spritesRef.current,
      reducedMotion: reducedMotionRef.current,
      cache: (renderCacheRef.current ||= createRenderCache()),
    });
  }, [input]);

  // Coin and ally sprites; the canvas falls back to shapes until they load.
  useEffect(() => {
    for (const [name, url] of Object.entries(SPRITE_URLS)) {
      const img = new Image();
      img.onload = render;
      img.src = url;
      spritesRef.current[name] = img;
    }
  }, [render]);

  // Match the canvas to its box and pixel density; spawn just off-screen.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      const dpr = Math.min(
        2,
        window.devicePixelRatio || 1,
        resolutionRef.current,
      );
      viewRef.current = { w: width, h: height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (gameRef.current)
        gameRef.current.spawnRadius = Math.hypot(width, height) / 2 + 40;
      paletteRef.current = null;
      render();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    // Theme switches change the palette.
    const themes = new MutationObserver(() => {
      paletteRef.current = null;
      render();
    });
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      observer.disconnect();
      themes.disconnect();
    };
  }, [render]);

  const finish = useCallback((s) => {
    const record = {
      time: Math.floor(s.time),
      kills: s.kills,
      level: s.level,
      coins: s.coinsEarned,
    };
    const previous = loadBest();
    const isNew = isBetter(record, previous);
    if (isNew) saveBest({ time: record.time, kills: record.kills });
    setBest(isNew ? record : previous);
    setResult({ ...record, isNew });
    setScreen("over");
  }, []);

  // Fixed-step simulation so speed doesn't depend on the display's FPS.
  useEffect(() => {
    if (screen !== "playing") return;
    let raf;
    let last = performance.now();
    let acc = 0;
    let hudAt = 0;
    let renderAt = 0;
    let slowFrames = 0,
      fastFrames = 0;
    const frame = (now) => {
      const s = gameRef.current;
      const elapsed = now - last;
      acc += Math.min(0.1, elapsed / 1000);
      last = now;
      while (acc >= STEP && !s.over && !s.pending) {
        step(s, input.vector(), STEP);
        audioRef.current?.consume(s);
        acc -= STEP;
      }
      if (now - renderAt >= 1000 / 60 - 0.5 || s.over || s.pending) {
        renderAt = now - ((now - renderAt) % (1000 / 60));
        render();
      }
      slowFrames = elapsed > 23 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      fastFrames = elapsed < 18 ? fastFrames + 1 : 0;
      const view = viewRef.current;
      const maxDpr = Math.min(2, window.devicePixelRatio || 1);
      const dpr =
        slowFrames >= 45
          ? Math.max(1, view.dpr - 0.25)
          : fastFrames >= 600
            ? Math.min(maxDpr, view.dpr + 0.25)
            : view.dpr;
      if (dpr !== view.dpr) {
        resolutionRef.current = dpr;
        view.dpr = dpr;
        canvasRef.current.width = Math.round(view.w * dpr);
        canvasRef.current.height = Math.round(view.h * dpr);
        render();
        slowFrames = fastFrames = 0;
      }
      if (now - hudAt > 100 || s.over || s.pending) {
        hudAt = now;
        setHud(snapshot(s));
      }
      if (s.over) return finish(s);
      if (s.pending) {
        setLevelUp(levelUpOf(s));
        return setScreen("levelup");
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const hide = () => document.hidden && setScreen("paused");
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [screen, input, render, finish]);

  const start = () => {
    audioRef.current?.unlock();
    audioRef.current?.reset();
    const { w, h } = viewRef.current;
    gameRef.current = createGame({
      seed: Date.now() >>> 0,
      spawnRadius: Math.hypot(w, h) / 2 + 40,
    });
    setHud(snapshot(gameRef.current));
    setResult(null);
    setScreen("playing");
  };
  const quit = () => {
    gameRef.current = null;
    setHud(null);
    setScreen("start");
    requestAnimationFrame(render);
  };
  const openShop = useCallback(() => {
    setShop(shopOf(gameRef.current));
    setScreen("shop");
  }, []);
  const buy = useCallback(
    (kind) => {
      const s = gameRef.current;
      const ok =
        kind === "guard"
          ? buyGuard(s)
          : kind === "scythe"
            ? buyScythe(s)
            : buyAlly(s, kind);
      if (!ok) return;
      setShop(shopOf(s));
      setHud(snapshot(s));
      render();
    },
    [render],
  );
  const choose = useCallback((id) => {
    const s = gameRef.current;
    chooseUpgrade(s, id);
    setHud(snapshot(s));
    if (s.pending) setLevelUp(levelUpOf(s));
    else setScreen("playing");
  }, []);

  useEffect(() => {
    const keyDown = (e) => {
      if (screen === "playing" && (e.code === "Escape" || e.code === "KeyP"))
        setScreen("paused");
      else if (screen === "playing" && e.code === "KeyB") openShop();
      else if (screen === "shop" && (e.code === "Escape" || e.code === "KeyB"))
        setScreen("playing");
      else if (screen === "shop" && /^Digit[1-9]$/.test(e.code)) {
        const n = Number(e.code.slice(5));
        if (SHOP_KEYS[n - 1]) buy(SHOP_KEYS[n - 1]);
      } else if (
        screen === "paused" &&
        (e.code === "Escape" || e.code === "KeyP")
      )
        setScreen("playing");
      else if (screen === "levelup" && /^Digit[1-3]$/.test(e.code)) {
        const id = gameRef.current?.pending?.[Number(e.code.slice(5)) - 1];
        if (id) choose(id);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [screen, choose, openShop, buy]);

  return (
    <>
      <PageHeader
        title="Giải trí"
        subtitle="Hướng Dương Thủ Vệ — sống sót càng lâu càng tốt."
      />
      <section className="panel game-panel">
        <div className="game-stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className="game-canvas"
            role="img"
            aria-label="Màn chơi Hướng Dương Thủ Vệ"
          />
          {hud && screen !== "start" && (
            <div className="game-phase">
              <strong>
                Đợt {hud.phase} ·{" "}
                {hud.breather
                  ? "Nghỉ lấy sức — hút giọt nắng"
                  : [
                      "Bầy sâu",
                      "Bọ giáp",
                      "Quái lao tới",
                      "Quái phun đạn",
                      "Quái phân tách",
                      "Rồng bóng tối và giáp vàng",
                      "Đại chiến rồng sấm",
                    ][Math.min(hud.phase - 1, 6)]}
              </strong>
              <span>
                Boss sau {formatTime(hud.bossIn)} ·{" "}
                {hud.level < 12
                  ? "Cấp 12 mở tiến hóa plasma"
                  : hud.level < 20
                    ? "Cấp 20 mở tiến hóa mặt trời"
                    : `Sức mạnh +${hud.power}% · Nâng cấp vô hạn`}
              </span>
            </div>
          )}
          {hud && screen !== "start" && (
            <GameHud
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              hud={hud}
              onPause={
                screen === "playing" ? () => setScreen("paused") : undefined
              }
              onShop={screen === "playing" ? openShop : undefined}
            />
          )}
          {screen === "start" && <StartCard best={best} onStart={start} />}
          {screen === "paused" && (
            <PauseCard onResume={() => setScreen("playing")} onQuit={quit} />
          )}
          {screen === "shop" && shop && (
            <ShopCard
              shop={shop}
              onBuy={buy}
              onClose={() => setScreen("playing")}
            />
          )}
          {screen === "levelup" && levelUp && (
            <LevelUpCard {...levelUp} onChoose={choose} />
          )}
          {screen === "over" && result && (
            <OverCard result={result} best={best} onRestart={start} />
          )}
        </div>
        <p className="game-help">
          Di chuyển bằng WASD hoặc phím mũi tên; trên điện thoại, chạm và kéo
          trong khung chơi. Esc hoặc P để tạm dừng; B mở cửa hàng đồng minh.
        </p>
      </section>
    </>
  );
}
