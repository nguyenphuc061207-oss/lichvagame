import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button, Progress } from "../../components/ui/primitives.jsx";
import { Sunflower } from "../../components/ui/Sunflower.jsx";
import {
  ALLIES,
  GUARD,
  SCYTHE,
  UPGRADES,
  LASERS,
  formatTime,
} from "../../lib/game.mjs";

const COIN = "/images/game/aya-coin.png";
const GUARD_ICON = "/images/game/guard-armor.png";
const SCYTHE_ICON = "/images/game/scythe.png";
const ALLY_ICON = {
  bird: "/images/mascot/bird.webp",
  robot: "/images/mascot/robot.webp",
  flyer: "/images/mascot/flyer.webp",
  orange: "/images/mascot/orange.webp",
  guardian: "/images/game/aya-guardian.png",
};

const Coin = ({ size = 18 }) => (
  <img className="game-coin" src={COIN} alt="" width={size} height={size} />
);

export function GameHud({ hud, onPause, onShop, soundEnabled, onToggleSound }) {
  return (
    <div className="game-hud">
      <div className="game-meter game-hp">
        <span>
          Máu {Math.ceil(hud.hp)}/{hud.maxHp}
          {hud.shieldMax > 0 &&
            ` · Giáp ${Math.ceil(hud.shield)}/${hud.shieldMax}`}
        </span>
        <Progress value={(hud.hp / hud.maxHp) * 100} label="Máu" />
      </div>
      <div className="game-meter">
        <span>Cấp {hud.level}</span>
        <Progress value={(hud.xp / hud.xpNext) * 100} label="Kinh nghiệm" />
      </div>
      <button
        className="game-wallet"
        onClick={onShop}
        disabled={!onShop}
        aria-label={`Đồng minh: ${hud.coins} xu Aya, quân ${hud.allies}/${hud.slots}`}
        title="Cửa hàng đồng minh (B)"
      >
        <Coin />
        <strong>{hud.coins}</strong>
        <span>
          <Users size={14} /> {hud.allies}/{hud.slots}
        </span>
        {hud.guards > 0 && <span title={GUARD.name}>🛡 {hud.guards}</span>}
        {hud.scythes > 0 && (
          <span title={`${SCYTHE.name} — sẵn sàng/tổng số`}>
            ⚔ {hud.scythesReady}/{hud.scythes}
          </span>
        )}
      </button>
      <div className="game-stats">
        <strong>{formatTime(hud.time)}</strong>
        <span>{hud.kills} hạ gục</span>
        <span>{LASERS[hud.laser || 0].title}</span>
      </div>
      {onToggleSound && (
        <button
          className="icon-button game-sound"
          onClick={onToggleSound}
          aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          aria-pressed={soundEnabled}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      )}
      {onPause && (
        <button
          className="icon-button game-pause"
          onClick={onPause}
          aria-label="Tạm dừng"
          title="Tạm dừng (Esc)"
        >
          <Pause size={18} />
        </button>
      )}
    </div>
  );
}

function Best({ best }) {
  return best ? (
    <p className="game-best">
      <Trophy size={15} /> Kỷ lục: sống {formatTime(best.time)}, hạ {best.kills}
    </p>
  ) : (
    <p className="game-best">Chưa có kỷ lục — hãy là người đầu tiên!</p>
  );
}

export function StartCard({ best, onStart }) {
  return (
    <div className="game-overlay">
      <div className="game-card">
        <Sunflower size={52} />
        <h2>Hướng Dương Thủ Vệ</h2>
        <p>
          Bầy sâu bọ đang kéo đến cánh đồng. Né chúng, hoa sẽ tự bắn hạt. Nhặt
          giọt nắng để lên cấp và chọn sức mạnh mới.
        </p>
        <Best best={best} />
        <Button icon={Play} onClick={onStart}>
          Bắt đầu
        </Button>
      </div>
    </div>
  );
}

export function PauseCard({ onResume, onQuit }) {
  return (
    <div className="game-overlay">
      <div className="game-card">
        <h2>Tạm dừng</h2>
        <div className="game-actions">
          <Button icon={Play} onClick={onResume} autoFocus>
            Tiếp tục
          </Button>
          <Button kind="secondary" onClick={onQuit}>
            Bỏ ván
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LevelUpCard({
  level,
  choices,
  upgrades,
  slotUnlocked,
  onChoose,
}) {
  const first = useRef(null);
  useEffect(() => first.current?.focus(), [choices]);
  return (
    <div className="game-overlay">
      <div className="game-card wide">
        <h2>Lên cấp {level}!</h2>
        {slotUnlocked && (
          <p className="game-unlock">
            <Users size={16} /> Mở khóa thêm 1 chỗ đồng minh — bấm B để mua.
          </p>
        )}
        <p>Chọn một sức mạnh (phím 1–{choices.length}).</p>
        <div className="game-choices">
          {choices.map((id, i) => {
            const u = UPGRADES[id];
            const owned = upgrades[id] || 0;
            return (
              <button
                key={id}
                ref={i === 0 ? first : undefined}
                className="game-choice"
                onClick={() => onChoose(id)}
              >
                <span className="game-key">{i + 1}</span>
                <strong>
                  {u.color && (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: 24,
                        height: 5,
                        borderRadius: 4,
                        marginRight: 8,
                        background: u.color,
                        boxShadow: `0 0 6px ${u.color}`,
                      }}
                    />
                  )}
                  {u.title}
                </strong>
                <span>{u.text}</span>
                {Number.isFinite(u.max) && (
                  <small>
                    Cấp {owned + 1}/{u.max}
                  </small>
                )}
                {!Number.isFinite(u.max) && !u.fallback && (
                  <small>Cấp {owned + 1} · Không giới hạn</small>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ShopCard({ shop, onBuy, onClose }) {
  const full = shop.used >= shop.slots;
  return (
    <div className="game-overlay">
      <div className="game-card wide">
        <h2>Đồng minh</h2>
        <p className="game-wallet-line">
          <Coin size={22} /> <strong>{shop.coins}</strong> xu Aya · Quân{" "}
          {shop.used}/{shop.slots}
        </p>
        {full && (
          <p className="game-unlock">
            {shop.nextLevel
              ? `Đã đủ quân. Lên cấp ${shop.nextLevel} để mở thêm 1 chỗ.`
              : "Đã mở tối đa số chỗ đồng minh."}
          </p>
        )}
        <div className="game-choices">
          {shop.items.map(({ kind, cost, blocker, owned }, i) => {
            const ally = ALLIES[kind];
            return (
              <button
                key={kind}
                className="game-choice game-ally"
                onClick={() => onBuy(kind)}
                disabled={Boolean(blocker)}
                autoFocus={i === 0 && !blocker}
              >
                <span className="game-key">{i + 1}</span>
                <img src={ALLY_ICON[kind]} alt="" className="game-ally-img" />
                <strong>{ally.name}</strong>
                <span>{ally.text}</span>
                <small>
                  <Coin size={14} /> {cost} xu
                  {owned > 0 && ` · đang có ${owned}`}
                  {blocker === "coins" && ` · thiếu ${cost - shop.coins}`}
                </small>
              </button>
            );
          })}
        </div>
        <h3 className="game-section">Vật phẩm</h3>
        <div className="game-choices">
          <button
            className="game-choice game-ally"
            onClick={() => onBuy("guard")}
            disabled={Boolean(shop.guard.blocker)}
          >
            <span className="game-key">{Object.keys(ALLIES).length + 1}</span>
            <img src={GUARD_ICON} alt="" className="game-ally-img" />
            <strong>{GUARD.name}</strong>
            <span>{GUARD.text}</span>
            <small>
              <Coin size={14} /> {shop.guard.cost} xu
              {shop.guard.owned > 0 && ` · đang có ${shop.guard.owned}`}
              {shop.guard.blocker === "coins" &&
                ` · thiếu ${shop.guard.cost - shop.coins}`}
            </small>
          </button>
          <button
            className="game-choice game-ally"
            onClick={() => onBuy("scythe")}
            disabled={Boolean(shop.scythe.blocker)}
          >
            <span className="game-key">{Object.keys(ALLIES).length + 2}</span>
            <img src={SCYTHE_ICON} alt="" className="game-ally-img" />
            <strong>{SCYTHE.name}</strong>
            <span>{SCYTHE.text}</span>
            <small>
              <Coin size={14} /> {shop.scythe.cost} xu
              {shop.scythe.owned > 0 && ` · đang có ${shop.scythe.owned}`}
              {shop.scythe.blocker === "coins" &&
                ` · thiếu ${shop.scythe.cost - shop.coins}`}
            </small>
          </button>
        </div>
        <Button kind="secondary" icon={ArrowLeft} onClick={onClose}>
          Quay lại (B)
        </Button>
      </div>
    </div>
  );
}

export function OverCard({ result, best, onRestart }) {
  return (
    <div className="game-overlay">
      <div className="game-card">
        <h2>{result.isNew ? "Kỷ lục mới!" : "Hoa đã gục ngã"}</h2>
        <div className="game-result">
          <div>
            <strong>{formatTime(result.time)}</strong>
            <span>sống sót</span>
          </div>
          <div>
            <strong>{result.kills}</strong>
            <span>hạ gục</span>
          </div>
          <div>
            <strong>{result.level}</strong>
            <span>cấp</span>
          </div>
          <div>
            <strong>{result.coins}</strong>
            <span>xu Aya</span>
          </div>
        </div>
        {!result.isNew && <Best best={best} />}
        <Button icon={RotateCcw} onClick={onRestart} autoFocus>
          Chơi lại
        </Button>
      </div>
    </div>
  );
}
