import { Component } from "react";

// Decorative scenery must never take the app down: if it fails to load or
// throws while rendering (old browsers, flaky network, odd GPU), show the
// fallback instead of letting React unmount the whole tree.
export class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("Cảnh nền gặp lỗi, dùng cảnh dự phòng:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
