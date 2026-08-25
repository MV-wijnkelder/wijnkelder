import assert from "node:assert/strict";
import test from "node:test";

import { createRecognitionFormData } from "../src/services/ai-service.ts";

const photo = (name, contents = name) => new File([contents], name, { type: "image/jpeg" });

test("front only keeps the original single-image upload path", () => {
  const front = photo("front.jpg");
  const form = createRecognitionFormData(front);

  assert.deepEqual([...form.keys()], ["image"]);
  assert.equal(form.get("image"), front);
});

test("front and back use the dual-label fields with actual files", () => {
  const front = photo("front.jpg");
  const back = photo("back.jpg");
  const form = createRecognitionFormData(front, back);

  assert.deepEqual([...form.keys()], ["frontLabel", "backLabel"]);
  assert.equal(form.get("frontLabel"), front);
  assert.equal(form.get("backLabel"), back);
  assert.deepEqual(
    [...form.values()].map((file) => ({
      isFile: file instanceof File,
      isBlob: file instanceof Blob,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
    [
      { isFile: true, isBlob: true, name: "front.jpg", size: 9, type: "image/jpeg" },
      { isFile: true, isBlob: true, name: "back.jpg", size: 8, type: "image/jpeg" },
    ],
  );
});

test("removing the back label restores the original payload", () => {
  const form = createRecognitionFormData(photo("front.jpg"), undefined);
  assert.deepEqual([...form.keys()], ["image"]);
  assert.equal(form.get("backLabel"), null);
});

test("retaking the front sends the replacement File", () => {
  const replacement = photo("front-retake.jpg", "new front");
  const form = createRecognitionFormData(replacement, photo("back.jpg"));
  assert.equal(form.get("frontLabel"), replacement);
  assert.equal(form.get("frontLabel").name, "front-retake.jpg");
});

test("retaking the back sends the replacement File", () => {
  const replacement = photo("back-retake.jpg", "new back");
  const form = createRecognitionFormData(photo("front.jpg"), replacement);
  assert.equal(form.get("backLabel"), replacement);
  assert.equal(form.get("backLabel").name, "back-retake.jpg");
});

test("Blob uploads are accepted but preview URLs are rejected", () => {
  const blob = new Blob(["image"], { type: "image/png" });
  assert.ok(createRecognitionFormData(blob).get("image") instanceof Blob);
  assert.throws(
    () => createRecognitionFormData(photo("front.jpg"), "blob:https://example.test/preview"),
    /backLabel must be a File or Blob/,
  );
});
