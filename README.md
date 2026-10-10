# TranAya

Ứng dụng cá nhân bằng tiếng Việt cho sinh viên Kế toán vừa học vừa làm. Mở ứng dụng là thấy lịch trong ngày. React 19 + Vite, Lucide, CSS với các token dùng chung; giữ stack JavaScript hiện có. Không cần khóa API hoặc biến môi trường.

Màn mở đầu có ảnh chân dung (`public/images/intro-portrait.png`) và dòng chữ TranAya; màn mở đầu chờ đến khi chạm vào bó hoa: cánh hoa bay ra tứ phía, người mờ dần rồi cánh hoa tụ lại thành con cá sấu; cá sấu bay vào và nhập với con cá sấu của cảnh nền (Ultra HD: con đang bò, HD: con đứng yên; khi chất lượng Auto không có cá sấu nền thì bay vào logo ở thanh bên). Mở ứng dụng luôn vào Trang chủ, bất kể địa chỉ có kèm mục khác, chữ TranAya thu về logo. Chế độ giảm chuyển động bỏ qua hiệu ứng. Phong cách tối giản với điểm nhấn vàng hướng dương, nền kem và bảng màu sáng/tối. Nền là tranh minh họa SVG cánh đồng hướng dương (nắng sớm ở chế độ sáng, đêm trăng có đom đóm ở chế độ tối), hoa lớn ở hai mép để vùng nội dung giữa luôn thoáng; tạo lại bằng `node scripts/sunflower-background.mjs`; các khung nội dung dùng nền kính mờ. Tổng quan mở sẵn lịch ngày, công việc và deadline; thói quen và mục tiêu nằm trong mục “Tổng quan thêm”. Auto / HD / Ultra HD chuyển vào Cài đặt và hiện chỉ lưu lựa chọn. Tùy chọn điểm nhấn giữ khóa lưu cũ để tương thích dữ liệu hiện có.

## Chạy

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run build
npm run preview
```

Mở http://127.0.0.1:5173. Dùng cùng địa chỉ, cổng và trình duyệt để truy cập dữ liệu đã lưu; IndexedDB thuộc từng origin.

## Bộ cài Windows (.exe)

```sh
npm run desktop:dist   # tạo release/TranAya-Setup-1.0.0.exe
npm run desktop        # chạy thử bản desktop từ mã nguồn
```

Bộ cài (Electron + NSIS) cài theo từng người dùng, không cần quyền quản trị: cho chọn thư mục cài, tạo lối tắt Desktop và Start Menu, có trình gỡ cài đặt. Gói chứa đủ tính năng và hoạt động không cần mạng (phông chữ thương hiệu đã nhúng sẵn). Giao diện được nạp từ `app://tranaya`, dữ liệu vẫn lưu trong IndexedDB `mimis-world` của chính ứng dụng (thư mục `%APPDATA%\TranAya`), tách biệt với dữ liệu trên trình duyệt; muốn chuyển dữ liệu sang bản cài thì xuất JSON ở Cài đặt rồi nhập lại. Gỡ cài đặt không xóa dữ liệu. Bộ cài chưa ký số nên Windows SmartScreen có thể cảnh báo "Windows protected your PC": chọn _More info → Run anyway_. Nếu `electron-builder` báo `EPERM` khi giải nén Electron, chạy lại với `-c.electronDist=node_modules/electron/dist`. Mã vỏ desktop nằm ở `desktop/main.cjs`.

## Đồng bộ giữa điện thoại và máy tính

Cài đặt → "Đồng bộ giữa các thiết bị". Bấm **Tạo mã đồng bộ** trên một thiết bị rồi nhập mã đó vào thiết bị còn lại (ô "Đã có mã từ thiết bị khác?"): dữ liệu thiết bị thứ hai được thay bằng dữ liệu của mã. Từ đó mọi thay đổi tự đẩy lên sau ~2 giây và tự kéo về khi mở app, quay lại tab, có mạng lại hoặc mỗi phút. Hai máy cùng sửa trước khi đồng bộ thì máy đến sau được hỏi giữ bản nào, không có gì bị ghi đè âm thầm. Giao diện (sáng/tối, đồ họa, thu gọn thanh bên) là riêng từng thiết bị và không đồng bộ. Mã là chìa khóa: ai có mã đều đọc được dữ liệu, nên giữ kín; máy chủ chỉ lưu mã băm SHA-256 của mã. Dữ liệu chưa được mã hóa đầu cuối.

Máy chủ là Vercel Function `api/sync.js` (lõi xử lý ở `server/sync-core.mjs`) lưu vào Neon Postgres, bảng `sync_docs` được tự tạo ở lần gọi đầu. Cách bật trên Vercel: Storage → thêm Neon và gắn vào project (Vercel tự đặt `DATABASE_URL`), rồi deploy lại. Chạy `npm run dev` hoặc `npm run preview` thì API chạy trong bộ nhớ (mất khi tắt) để thử cục bộ. Bản cài Windows cần đặt `VITE_SYNC_URL` (địa chỉ web đã deploy) lúc build mới dùng được đồng bộ; không đặt thì mục này báo chưa dùng được.

## Thêm nhanh cho người lười

Tổng quan và Lịch trình có ô "Thêm nhanh": gõ một dòng tiếng Việt, xem bản nháp bên dưới rồi nhấn Enter. Ví dụ: `kế toán t2 t4 7h-9h` (lịch lặp hằng tuần), `ca làm mai 18h`, `nộp bài thuế thứ 6` (thành công việc), `thi KTTC 15/12 8h phòng A2`, `yoga t3 6h 8 tuần`. Nút bộ lọc cạnh ô mở form đầy đủ với dữ liệu đã điền. Giờ kết thúc, loại lịch và độ dài ca được đoán từ lịch cũ; khi ô trống, các lịch hay dùng hiện thành nút bấm một chạm. Form thêm mới chỉ hỏi tên, ngày, giờ; phần còn lại nằm trong "Thêm chi tiết". Logic ở `src/lib/quickAdd.mjs`, có kiểm thử riêng.

## Các mục

- Tổng quan: lịch ngày, công việc, deadline và lịch thi. Chọn ngày trực tiếp; thêm lịch/việc ở từng mục. Widget thói quen/mục tiêu có thể mở rộng hoặc ẩn trong Cài đặt.
- Lịch trình: ngày/tuần/tháng, lọc loại, tạo/sửa/xóa, lặp hằng ngày hoặc nhiều thứ trong tuần, chu kỳ 1–52 tuần, đặt nhanh thời hạn 4/8/12/16 tuần, bỏ ngày nghỉ và có ngày kết thúc, trạng thái hoàn thành/hủy và cảnh báo trùng giờ. Lịch thi từ Học tập cũng xuất hiện tại đây.
- Công việc: tìm kiếm, lọc ngày/ưu tiên/loại, hôm nay/sắp tới/quá hạn/đã hoàn thành, hoàn thành/mở lại, nhắc trong app.
- Học tập: học kỳ, môn/giảng viên, bài tập/hạn nộp, thi, điểm và trọng số riêng từng môn, ghi chú có thể tìm kiếm, lên lịch ôn và lưu liên kết tài liệu. Trung bình phần đã chấm được ghi nhãn riêng với tổng kết; cảnh báo trọng số khác 100%.
- Phát triển bản thân: thói quen ngày/tuần, lịch sử ghi nhận, mục tiêu, nhật ký/tâm trạng và nhìn lại tuần.
- Kho lưu trữ: liên kết, ghi chú/danh sách mua sắm, danh mục, thẻ, tìm kiếm, yêu thích; chỉ mở URL http(s).
- Giải trí: mini-game sinh tồn "Hướng Dương Thủ Vệ" — di chuyển bằng WASD/phím mũi tên hoặc chạm-kéo, hoa tự bắn hạt, nhặt giọt nắng để lên cấp và chọn 1 trong 3 nâng cấp; kẻ địch rơi xu Aya (mặt nhân vật linh vật) để mua đồng minh là các bạn đồng hành của linh vật (Chim Sao, Robot Thiên Thần, Phi Công Nhí, Cam Gai) bằng phím B hoặc nút xu; số chỗ đồng minh mở theo cấp 1/3/6/10/15/20 (tối đa 6) và giá tăng theo số quân đã có; vật phẩm "Giáp hộ mệnh" (phím 5, giá 10 xu, tăng 5 xu mỗi lần mua) hồi sinh khi hết máu với 40% máu tối đa, tiêu hao một lượt; "Liềm đoạt mệnh" (phím 6, giá 15 xu, tăng 8 xu mỗi lần mua) khi sắp chết sẽ bất tử 5 giây và giữ máu ở 1, được dùng trước giáp; liềm vĩnh viễn, dùng xong hồi sau 60 giây, mỗi lần mua thêm là một liềm có thời gian hồi riêng; ảnh xu tạo bằng `python scripts/game-sprites.py`; Esc/P tạm dừng, tự dừng khi chuyển tab. Kỷ lục lưu `localStorage` (khóa `tranaya-game-best`), độc lập với IndexedDB và bản sao lưu. Ván đang chơi không được giữ khi rời trang.
- Cài đặt: tên/avatar dạng chữ hoặc emoji, theme hệ thống/sáng/tối, 3 accent, sidebar thu gọn, ẩn widget, xuất/nhập JSON và xóa toàn bộ có xác nhận.

## Dữ liệu và riêng tư

Lưu toàn bộ snapshot vào `mimis-world` / IndexedDB, phiên bản database và schema đều là 1. Giữ tên database cũ để dữ liệu hiện có tiếp tục truy cập được. Tất cả thao tác ghi được kiểm tra trước khi lưu, xếp hàng và chỉ cập nhật UI sau khi giao dịch hoàn thành. Revision được kiểm tra trong cùng transaction: nếu tab khác đã lưu, tải bản mới và báo người dùng kiểm tra rồi thử lại. Lần đầu có dữ liệu mẫu, banner phân biệt rõ và cho xóa riêng. Sửa một mục mẫu chuyển mục đó thành dữ liệu của bạn. Khi xóa mẫu, giữ lại môn học hoặc thói quen cần cho dữ liệu thật.

Bản sao lưu được kiểm tra phiên bản, collection, trường dữ liệu, ID trùng và quan hệ môn học/thói quen trước khi khôi phục. Không tự ghi đè dữ liệu hỏng. JSON chứa nhật ký và giao dịch; giữ tệp riêng tư. Không có gửi nhật ký tới AI, analytics, tài khoản hoặc cloud. Khi nâng schema trong tương lai cần thêm migration trước khi tăng phiên bản; phiên bản chưa hỗ trợ sẽ bị từ chối.

## Cấu trúc

- `src/App.jsx`: ghép hooks, màn hình và các lớp modal/thông báo.
- Ultra HD chọn được trên mọi thiết bị, không có giới hạn theo cấu hình: máy ít nhân/ít RAM hoặc điện thoại tự giảm số hạt hiệu ứng và còn 20 khung/giây (`src/lib/device.mjs`); chọn chất lượng/giao diện đổi ngay rồi lưu nền, nên lưu chậm hoặc bị chặn cũng không làm nút "đứng im"; nếu cảnh Ultra tải hoặc chạy lỗi thì tự dùng cảnh HD thay vì trắng màn hình. Hiệu năng: linh vật (SVG + SMIL) được điều khiển ở 30 khung/giây thay vì 60–144; cảnh Ultra HD và mini-game được tách gói, chỉ tải khi dùng.
- `src/features/`: từng chức năng có thư mục riêng; `game/` gồm view canvas, vẽ và điều khiển, logic game thuần ở `src/lib/game.mjs`; `forms/` chứa editor và cấu hình nhập liệu.
- `src/components/layout/`, `shared/`, `ui/`: khung app, các khối dùng chung và thành phần giao diện cơ bản.
- `src/hooks/`: quản lý dữ liệu, thao tác và điều hướng hash; `useThrottledAnimations` cho các animation trang trí của cảnh Ultra HD chạy 30 khung/giây thay vì theo tần số màn hình.
- `src/config/navigation.jsx`: cấu hình menu và ánh xạ màn hình.
- `src/lib/`: logic thuần theo lĩnh vực (ngày, tài chính, điểm, validation, thao tác dữ liệu) và các kiểm thử. `domain.mjs` là điểm xuất chung.
- `src/services/`: IndexedDB và tải tệp; `src/lib/demo.mjs` chứa dữ liệu minh họa.
- `src/styles/`: token/theme, component và responsive; `index.css` là điểm nhập.
- `scripts/`: kiểm tra render, tương phản và tương tác DOM mô phỏng. Mã starter không sử dụng đã được bỏ.
- `.agents/skills/apple-design/`: skill Apple Design đã cài ở phạm vi dự án. Bộ tài liệu tham chiếu HIG chưa được cung cấp; không khẳng định tuân thủ toàn bộ HIG.

## Kiểm tra

```sh
npm test
npm run test:interaction
npm run check:ui
npm run lint
npm run format:check
npm run build
```

Kiểm thử domain bao gồm thu/chi/chuyển tiền, lương, điểm/trọng số, lịch lặp/trùng giờ, ngày nhuận, giờ Việt Nam, nhắc việc, quan hệ, backup và CSV. Kiểm thử storage sử dụng fake-indexeddb cho create/update/delete/readback, lỗi ghi, xóa dữ liệu và xung đột revision. Kiểm thử hồi quy kiểm tra ngày mặc định khi mở form và ngân sách không phân biệt hoa/thường. `test:interaction` dùng jsdom và React Testing Library để kiểm tra điều hướng, thao tác công việc, mở lại app và lỗi lưu form. `check:ui` dựng phía server 7 màn hình, 13 form với dữ liệu mẫu và dữ liệu trống, đồng thời đo tương phản màu bằng giá trị hex. Các kiểm tra này không thay thế QA hiển thị trong trình duyệt thật.

## Giới hạn và bước tiếp

- Local-first: không có cloud sync, tài khoản hoặc cộng tác. Có bảo vệ ghi đè từ tab cũ, chưa tự cập nhật trực tiếp giữa các tab. Không có Supabase hoặc AI ở MVP.
- Nhắc việc chỉ hiển thị khi tổng quan mở và thời điểm đã đến, cập nhật mỗi phút; không có thông báo nền.
- Lịch hỗ trợ sự kiện trong cùng ngày; trạng thái/chỉnh sửa giờ/xóa áp dụng toàn bộ chuỗi lặp. Có thể bỏ riêng một buổi và khôi phục trong phần sửa lịch. Kiểm tra trùng giờ tối đa 12 tháng từ ngày bắt đầu.
- Ngôn ngữ, tiền tệ và múi giờ bản này là tiếng Việt / VND / Asia/Ho_Chi_Minh. Định dạng và labels tập trung để bổ sung bản địa hóa sau.
- Chưa có upload file; lưu liên kết tài liệu. Chưa kéo thả thứ tự widget; có ẩn widget. Mục Tài chính đã bỏ khỏi giao diện; các collection cũ vẫn giữ trong IndexedDB/backup để tránh làm mất dữ liệu.
- Cần QA trình duyệt thật ở 390px/1440px, chế độ tối, zoom 200%, bàn phím, modal, nhập JSON, tải CSV và refresh. Công cụ trình duyệt phiên này từng chặn URL local; chưa xác minh bằng screenshot.
- Bước tiếp: xác nhận trải nghiệm trên thiết bị thật; sau đó cân nhắc đồng bộ có tài khoản nếu cần. Không xuất bản trong yêu cầu này.

## Kết quả kiểm tra hiện tại

- 33/33 kiểm thử domain, hồi quy và IndexedDB mô phỏng thành công.
- Tương tác DOM mô phỏng: điều hướng 7 mục, CRUD công việc, trạng thái hoàn thành, mở lại giữ dữ liệu và khôi phục form sau lỗi lưu.
- Dựng phía server: 7 màn hình và 13 form ở cả trạng thái mẫu và trống thành công.
- 20 cặp màu được đo đều ≥ 4,5:1; cặp thấp nhất 4,93:1. Đây là phép đo token được sử dụng, không phải chứng nhận accessibility toàn app.
- Production build thành công; máy chủ local trả HTTP 200.
- Lint không cho phép cảnh báo; mã nguồn được định dạng thống nhất bằng Prettier.
- Chưa kiểm thử hiển thị trong trình duyệt thật hoặc chụp màn hình responsive do giới hạn công cụ của phiên này.
