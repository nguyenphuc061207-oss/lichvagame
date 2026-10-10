import { useEffect, useState } from "react";

const ZONE = "Asia/Ho_Chi_Minh";
const clockFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const dayFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ZONE,
  weekday: "long",
});
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function Home() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <section className="home" aria-label="Trang chủ">
      <div className="home-clock">
        <time
          className="home-time"
          dateTime={new Date(now).toISOString()}
          aria-label="Giờ hiện tại"
        >
          {clockFormat.format(now)}
        </time>
        <p className="home-weekday">{dayFormat.format(now)}</p>
        <p className="home-date">{dateFormat.format(now)}</p>
        <p className="home-zone">Giờ Việt Nam · GMT+7</p>
      </div>
    </section>
  );
}
