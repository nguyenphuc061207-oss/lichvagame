import { useState, useRef } from "react";
import { Download, Upload, Trash2, Check } from "lucide-react";
import { Button, Section } from "../../components/ui/primitives.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { todayISO, validateBackup, COLLECTIONS } from "../../lib/domain.mjs";
import { download } from "../../lib/storage.mjs";
import { Switch } from "../../components/ui/Switch.jsx";
import { ThemeToggle } from "../../components/ui/ThemeToggle.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";

export function Settings({ ctx }) {
  const prefs = ctx.state.preferences;
  const [name, setName] = useState(prefs.name);
  const input = useRef(null);
  const setPreference = (key, value) =>
    ctx
      .commit((s) => ({
        ...s,
        preferences: { ...s.preferences, [key]: value },
      }))
      .catch(() => {});
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      ctx.notify("Tệp quá lớn. Giới hạn 10 MB.", "error");
      return;
    }
    try {
      const data = validateBackup(JSON.parse(await file.text()));
      ctx.confirm({
        title: "Khôi phục bản sao lưu?",
        message:
          "Dữ liệu hiện tại sẽ được thay thế. Hãy xuất bản sao lưu trước nếu cần giữ lại.",
        run: async () => {
          await ctx.commit(() => data);
          ctx.navigate("dashboard");
        },
      });
    } catch (error) {
      ctx.notify(error.message || "Không đọc được tệp.", "error");
    }
  };
  const count = COLLECTIONS.reduce((sum, k) => sum + ctx.state[k].length, 0);
  return (
    <>
      <PageHeader
        title="Cài đặt"
        subtitle="Một thế giới nhỏ, theo cách của bạn."
      />
      <div className="settings-grid">
        <Section title="Hồ sơ của bạn">
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await ctx
                .commit((s) => ({
                  ...s,
                  preferences: {
                    ...s.preferences,
                    name: name.trim(),
                  },
                }))
                .catch(() => {});
            }}
          >
            <label className="field">
              Tên bạn muốn được gọi
              <input
                value={name}
                required
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                pattern=".*\S.*"
              />
            </label>
            <div className="profile-picture">
              <Avatar />
            </div>
            <Button type="submit" icon={Check}>
              Lưu hồ sơ
            </Button>
          </form>
        </Section>
        <Section title="Không gian của bạn">
          <label className="field">
            Giao diện
            <select
              value={prefs.theme}
              onChange={(e) => setPreference("theme", e.target.value)}
            >
              <option value="system">Theo hệ thống</option>
              <option value="light">Sáng</option>
              <option value="dark">Tối</option>
            </select>
          </label>
          <label className="field">
            Điểm nhấn
            <select
              value={prefs.accent}
              onChange={(e) => setPreference("accent", e.target.value)}
            >
              <option value="rose">Vàng hướng dương</option>
              <option value="plum">Nâu đất ấm</option>
              <option value="sage">Xanh lá</option>
            </select>
          </label>
          <div className="quality-setting">
            <p className="muted">Chất lượng hiển thị</p>
            <ThemeToggle
              theme={prefs.theme}
              quality={prefs.quality || "auto"}
              commit={ctx.commit}
              disabled={ctx.saving}
              showTheme={false}
            />
          </div>
          <Switch
            label="Thanh bên thu gọn"
            checked={prefs.compact}
            onChange={(v) => setPreference("compact", v)}
          />
        </Section>
        <Section title="Màn hình tổng quan">
          {[
            ["habits", "Thói quen"],
            ["goals", "Mục tiêu cá nhân"],
          ].map(([k, label]) => (
            <Switch
              key={k}
              label={label}
              checked={prefs.widgets[k]}
              onChange={(value) =>
                ctx
                  .commit((s) => ({
                    ...s,
                    preferences: {
                      ...s.preferences,
                      widgets: { ...s.preferences.widgets, [k]: value },
                    },
                  }))
                  .catch(() => {})
              }
            />
          ))}
        </Section>
        <Section title="Ngôn ngữ & định dạng">
          <div className="setting-value">
            <span>Ngôn ngữ</span>
            <strong>Tiếng Việt</strong>
          </div>
          <div className="setting-value">
            <span>Tiền tệ</span>
            <strong>VND · Đồng Việt Nam</strong>
          </div>
          <div className="setting-value">
            <span>Múi giờ</span>
            <strong>Asia/Ho_Chi_Minh</strong>
          </div>
          <p className="hint">
            Bản này hỗ trợ tiếng Việt và định dạng Việt Nam.
          </p>
        </Section>
        <Section title="Dữ liệu & riêng tư" className="wide">
          <p className="muted">
            {count} bản ghi · IndexedDB trên trình duyệt này. Dữ liệu không tự
            đồng bộ giữa thiết bị hoặc các tab. Nhật ký không được gửi tới dịch
            vụ AI. Xóa dữ liệu trình duyệt có thể làm mất dữ liệu; hãy sao lưu
            định kỳ.
          </p>
          <div className="settings-actions">
            <Button
              icon={Download}
              kind="secondary"
              onClick={() =>
                download(
                  "tranaya-" + todayISO() + ".json",
                  JSON.stringify(ctx.state, null, 2),
                )
              }
            >
              Sao lưu JSON
            </Button>
            <Button
              icon={Upload}
              kind="secondary"
              onClick={() => input.current.click()}
            >
              Khôi phục JSON
            </Button>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              aria-label="Chọn tệp sao lưu"
              onChange={importFile}
            />
            <Button kind="secondary" onClick={() => ctx.loadDemo()}>
              Nạp dữ liệu mẫu
            </Button>
            <Button icon={Trash2} kind="danger" onClick={() => ctx.clearAll()}>
              Xóa toàn bộ dữ liệu
            </Button>
          </div>
          <p className="hint">
            Tệp sao lưu chứa dữ liệu cá nhân, gồm nhật ký và giao dịch. Giữ tệp
            ở nơi riêng tư. Dữ liệu mẫu không thay thế dữ liệu của bạn.
          </p>
        </Section>
      </div>
    </>
  );
}
