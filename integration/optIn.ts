import { readdirSync, readFileSync } from "node:fs";

export const OPT_IN_PHRASE = "I_UNDERSTAND_THIS_WRITES_INTEGTEST_TICKETS_TO_LIVE";
export const OPT_IN_VARIABLES = ["LIVE_INTEGRATION_CONFIRM", "LIVE_INTEGRATION_OPTED_IN"] as const;

export function envFilesDefiningOptIn(dir: string): string[] {
  return readdirSync(dir).filter(
    (name) => name.startsWith(".env") && /^\s*(export\s+)?LIVE_INTEGRATION_/m.test(readFileSync(`${dir}/${name}`, "utf8")),
  );
}
