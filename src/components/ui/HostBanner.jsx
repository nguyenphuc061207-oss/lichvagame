import { TriangleAlert } from "lucide-react";
import {
  PRODUCTION_HOST,
  isTemporaryHost,
  productionUrl,
} from "../../lib/host.mjs";

// Warns when the app is opened at a one-off deployment address, whose data
// is separate from (and invisible to) the main address.
export function HostBanner({ navigate }) {
  if (typeof location === "undefined" || !isTemporaryHost(location.hostname))
    return null;
  return (
    <div className="host-banner" role="status">
      <TriangleAlert size={18} aria-hidden="true" />
      <div>
        <strong>Đây là địa chỉ tạm của một lần cập nhật.</strong>
        <p>
          Dữ liệu ở đây tách riêng và sẽ không thấy ở bản mới. Hãy luôn dùng{" "}
          <b>{PRODUCTION_HOST}</b>. Muốn mang dữ liệu ở đây sang: vào{" "}
          <button type="button" onClick={() => navigate("settings")}>
            Cài đặt
          </button>{" "}
          → Đồng bộ → Tạo mã, rồi mở địa chỉ chính và nhập mã đó.
        </p>
      </div>
      <a className="button" href={productionUrl()}>
        Mở địa chỉ chính
      </a>
    </div>
  );
}
