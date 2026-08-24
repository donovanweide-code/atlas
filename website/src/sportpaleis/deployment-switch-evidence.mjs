export function normalizeSwitchEvidence({ remoteExitCode, output, expectedRelease }) {
  const lines = String(output ?? "").split(/\r?\n/u);
  const switchPass = lines.some((line) => /^(?:SWITCH|LIVE_SWITCH)=PASS$/u.test(line));
  const activeRelease = lines.some((line) => line === `ACTIVE_RELEASE=${expectedRelease}`);
  const rollbackLine = lines.find((line) => /^(?:ROLLBACK|ROLLBACK_STATUS|ROLLBACK_RESULT)=/u.test(line)) ?? null;
  return {
    pass: Number(remoteExitCode) === 0 && switchPass && activeRelease,
    remoteExitCode: Number(remoteExitCode),
    switchPass,
    activeRelease,
    rollbackResult: rollbackLine?.slice(rollbackLine.indexOf("=") + 1) ?? null,
  };
}
