import { Suspense, useState } from "react";
import { Intro } from "./components/ui/Intro.jsx";
import { Sunflower } from "./components/ui/Sunflower.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { useAppActions } from "./hooks/useAppActions.js";
import { useNavigation } from "./hooks/useNavigation.js";
import { useSync } from "./hooks/useSync.js";
import { SyncConflict } from "./components/ui/SyncConflict.jsx";
import { VIEWS } from "./config/navigation.jsx";
import { todayISO } from "./lib/dates.mjs";
import { AppShell } from "./components/layout/AppShell.jsx";
import { Button } from "./components/ui/primitives.jsx";
import { Confirmation } from "./components/ui/Confirmation.jsx";
import { Toast } from "./components/ui/Toast.jsx";
import { Editor } from "./features/forms/Editor.jsx";
export default function App() {
  const [intro, setIntro] = useState(true);
  const content = <AppContent />;
  return (
    <>
      {content}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </>
  );
}
function AppContent() {
  const data = useAppData(),
    navigation = useNavigation(VIEWS),
    [date, setDate] = useState(todayISO);
  const actions = useAppActions({
    ...data,
    navigate: navigation.navigate,
    setDate,
  });
  const sync = useSync({
    state: data.state,
    commit: data.commit,
    notify: data.notify,
  });
  if (data.loadError)
    return (
      <div className="startup">
        <Sunflower size={48} />
        <h1>Chưa mở được thế giới của bạn</h1>
        <p role="alert">{data.loadError}</p>
        <p>
          Ứng dụng không ghi đè dữ liệu cũ. Kiểm tra quyền lưu trữ rồi thử lại.
        </p>
        <Button onClick={data.reload}>Thử lại</Button>
      </div>
    );
  if (!data.state)
    return (
      <div className="startup" role="status">
        <Sunflower size={48} />
        <h1>TranAya</h1>
        <p>Đang mở không gian của bạn…</p>
      </div>
    );
  const ctx = {
      ...data,
      ...actions,
      sync,
      date,
      setDate,
      navigate: navigation.navigate,
    },
    View = VIEWS[navigation.page];
  const overlays = (
    <>
      {actions.editor && (
        <Editor
          key={actions.editor.entity + (actions.editor.item?.id || "new")}
          {...actions.editor}
          state={data.state}
          onClose={actions.closeEditor}
          onSave={actions.save}
        />
      )}{" "}
      {actions.confirmation && (
        <Confirmation
          value={actions.confirmation}
          onClose={actions.closeConfirmation}
        />
      )}{" "}
      {data.toast && <Toast value={data.toast} onClose={data.dismissToast} />}
      {sync.conflict && <SyncConflict onResolve={sync.resolveConflict} />}
    </>
  );
  return (
    <AppShell
      {...data}
      {...navigation}
      clearDemo={actions.clearDemo}
      overlays={overlays}
    >
      <Suspense fallback={null}>
        <View key={navigation.page} ctx={ctx} />
      </Suspense>
    </AppShell>
  );
}
