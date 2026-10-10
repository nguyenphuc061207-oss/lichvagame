import { Search } from "lucide-react";

export function SearchBox({ value, onChange, placeholder = "Tìm kiếm…" }) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input
        aria-label={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
