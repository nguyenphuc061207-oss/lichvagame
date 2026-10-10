import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCTION_HOST, isTemporaryHost, productionUrl } from "./host.mjs";

test("Địa chỉ: địa chỉ riêng từng lần deploy là địa chỉ tạm", () => {
  for (const host of [
    "lichvagame-cepkvkyga-nguyenphuc061207-oss-projects.vercel.app",
    "lichvagame-git-main-nguyenphuc061207-oss-projects.vercel.app",
    "LICHVAGAME-8NJOHYM98-NGUYENPHUC061207-OSS-PROJECTS.VERCEL.APP",
  ])
    assert.equal(isTemporaryHost(host), true, host);
});

test("Địa chỉ: địa chỉ chính, máy cục bộ và bản cài không bị cảnh báo", () => {
  for (const host of [
    PRODUCTION_HOST,
    "Lichvagame.Vercel.App",
    "127.0.0.1",
    "localhost",
    "tranaya",
    "",
    undefined,
  ])
    assert.equal(isTemporaryHost(host), false, String(host));
  assert.equal(
    isTemporaryHost("x-abc.vercel.app", ""),
    false,
    "chưa cấu hình địa chỉ chính thì không cảnh báo",
  );
  assert.equal(productionUrl("a.vercel.app"), "https://a.vercel.app/#home");
});
