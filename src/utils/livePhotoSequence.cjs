function nextPhotoStep(step, faces, width, height) {
  if (!Number.isInteger(step) || step < 0 || step > 2 || faces?.length !== 1 || !(width > 0 && height > 0)) return step;
  const face = faces[0], frame = face.frame;
  if (!frame || Math.abs(face.rotationY || 0) > 20 || Math.abs(face.rotationZ || 0) > 20) return step;
  const x = (frame.left + frame.width / 2) / width, y = (frame.top + frame.height / 2) / height;
  if (x < 0.25 || x > 0.75 || y < 0.2 || y > 0.8 || frame.width / width < 0.18 || frame.width / width > 0.9) return step;
  const eyes = [face.leftEyeOpenProbability, face.rightEyeOpenProbability];
  return eyes.every(n => Number.isFinite(n) && n >= 0 && n <= 1 && (step === 1 ? n < 0.35 : n > 0.65)) ? step + 1 : step;
}
module.exports = {nextPhotoStep};
